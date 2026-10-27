from math import ceil

from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.authentication.models import Membership


def tenant_for(request):
    """Get the tenant selected in this user's authenticated session."""
    tenant_id = request.session.get("active_tenant_id")
    if not tenant_id:
        raise ValidationError({"tenant": "Select a tenant before using this endpoint."})

    membership = Membership.objects.select_related("tenant").filter(
        user=request.user,
        tenant_id=tenant_id,
        status=Membership.Status.ACTIVE,
        tenant__is_active=True,
    ).first()
    if not membership:
        request.session.pop("active_tenant_id", None)
        raise PermissionDenied("You do not have access to the selected tenant.")
    request._active_tenant_membership = membership
    return membership.tenant, membership.role


def require_manager(role, request=None, claim=None):
    """Allow managers, or a member with this exact resource:action claim."""
    if role in (Membership.Role.OWNER, Membership.Role.ADMIN):
        return

    membership = getattr(request, "_active_tenant_membership", None)
    if claim and membership and claim in membership.permissions:
        return
    raise PermissionDenied("You do not have permission to make this change.")

def success(data, meta=None, status_code=200):
    from rest_framework.response import Response

    return Response({"data": data, "meta": meta or {}, "error": None}, status=status_code)


def page_data(queryset, request, serializer_class, search_fields=(), sort_fields=()):
    """Apply shareable page, pageSize, search and sort query parameters."""
    search = request.query_params.get("search", "").strip()
    if search and search_fields:
        from django.db.models import Q

        query = Q()
        for field in search_fields:
            query |= Q(**{f"{field}__icontains": search})
        queryset = queryset.filter(query)

    sort = request.query_params.get("sort", "")
    if sort:
        descending = sort.startswith("-")
        field = sort[1:] if descending else sort
        if field in sort_fields:
            queryset = queryset.order_by(sort)

    try:
        page = max(int(request.query_params.get("page", 1)), 1)
        page_size = min(max(int(request.query_params.get("pageSize", 20)), 1), 100)
    except ValueError:
        raise ValidationError({"page": "page and pageSize must be whole numbers."})

    total = queryset.count()
    start = (page - 1) * page_size
    rows = queryset[start : start + page_size]
    return success(
        serializer_class(rows, many=True, context={"request": request}).data,
        {
            "page": page,
            "pageSize": page_size,
            "total": total,
            "pages": ceil(total / page_size) if total else 0,
            "search": search,
            "sort": sort,
        },
    )


class ApiEnvelopeMiddleware:
    """Wrap business API replies without changing the auth API contract."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if not request.path.startswith("/api/") or request.path.startswith("/api/auth/"):
            return response

        # Django HTML errors and files do not have DRF response data.
        if not hasattr(response, "data"):
            return response

        payload = response.data
        if isinstance(payload, dict) and {"data", "meta", "error"}.issubset(payload):
            return response

        if response.status_code >= 400:
            response.data = {"data": None, "meta": {}, "error": payload}
        else:
            response.data = {"data": payload, "meta": {}, "error": None}
        return response
