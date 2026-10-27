[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$script:checkCount = 0
$script:failureCount = 0

function Read-ProjectFile {
  param([Parameter(Mandatory = $true)][string]$RelativePath)

  $absolutePath = Join-Path $projectRoot $RelativePath
  if (-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
    return ""
  }

  return [System.IO.File]::ReadAllText($absolutePath)
}

function Write-Check {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][bool]$Passed,
    [Parameter(Mandatory = $true)][string]$Explanation
  )

  $script:checkCount++
  if ($Passed) {
    Write-Host "[PASS] $Name" -ForegroundColor Green
  }
  else {
    $script:failureCount++
    Write-Host "[FAIL] $Name" -ForegroundColor Red
  }
  Write-Host "       $Explanation"
}

Write-Host "Nexa ERP frontend architecture check" -ForegroundColor Cyan
Write-Host "Project: $projectRoot"
Write-Host "This is a read-only source check. It does not run TypeScript, ESLint, a build, or Django."
Write-Host ""

# Navigation configuration and component consumption.
$navigation = Read-ProjectFile "src\config\navigation.ts"
$sidebar = Read-ProjectFile "src\components\layout\app-sidebar.tsx"
$mobileSidebar = Read-ProjectFile "src\components\layout\mobile-sidebar.tsx"
$navigationLinks = [regex]::Matches($navigation, 'href:\s*["''](/[^"'']+)["'']')
$localMenuDefinitions = @()
$layoutDirectory = Join-Path $projectRoot "src\components\layout"
if (Test-Path -LiteralPath $layoutDirectory -PathType Container) {
  $localMenuDefinitions = @(
    Get-ChildItem -LiteralPath $layoutDirectory -Filter "*.tsx" -File |
      Where-Object { $_.Name -notin @("app-sidebar.tsx") } |
      Select-String -Pattern '(?i)(const|let)\s+\w*(navigation|menu)\w*\s*=\s*\['
  )
}

Write-Check `
  "Central navigation config" `
  ($navigation.Contains("export const navigationGroups") -and $navigationLinks.Count -gt 0) `
  "src/config/navigation.ts owns the ERP menu groups and links. Add menu entries there."
Write-Check `
  "Sidebar uses shared navigation" `
  ($sidebar.Contains('@/config/navigation') -and $sidebar.Contains('navigationGroups.map') -and $mobileSidebar.Contains('AppSidebar')) `
  "The desktop sidebar renders the configured groups; the mobile drawer reuses that sidebar."
Write-Check `
  "No component-local menu arrays detected" `
  ($localMenuDefinitions.Count -eq 0) `
  "Layout components should render shared navigation instead of maintaining another menu definition."

# Feature boundary and dashboard data flow.
$featureTypes = Read-ProjectFile "src\features\dashboard\types.ts"
$featureData = Read-ProjectFile "src\features\dashboard\data.ts"
$featureService = Read-ProjectFile "src\features\dashboard\service.ts"
$dashboardPage = Read-ProjectFile "src\app\(erp)\dashboard\page.tsx"
$activityUi = Read-ProjectFile "src\components\dashboard\recent-activity.tsx"
$chartUi = Read-ProjectFile "src\components\dashboard\sales-overview.tsx"

Write-Check `
  "Dashboard feature types and preview data" `
  ($featureTypes.Contains("DashboardSnapshot") -and $featureData.Contains("dashboardPreviewData")) `
  "Dashboard data contracts and illustrative values live under src/features/dashboard/."
Write-Check `
  "Dashboard service boundary" `
  ($featureService.Contains("getDashboardSnapshot") -and $dashboardPage.Contains("getDashboardSnapshot")) `
  "The route gets its dashboard snapshot through a feature service; replace this source when an API contract exists."
Write-Check `
  "Dashboard UI consumes typed data" `
  ($activityUi.Contains("activities: DashboardActivity[]") -and $chartUi.Contains("data: DashboardChartPoint[]")) `
  "Activity and chart components receive data as props and keep rendering concerns in the UI layer."

# Route group layout and URL preservation.
$erpLayout = Read-ProjectFile "src\app\(erp)\layout.tsx"
$homePage = Read-ProjectFile "src\app\page.tsx"
$authLayout = Read-ProjectFile "src\app\(auth)\layout.tsx"
$authPagePath = Join-Path $projectRoot "src\app\(auth)\page.tsx"
$erpRoutesExist = $true
foreach ($match in $navigationLinks) {
  $segment = $match.Groups[1].Value.TrimStart("/")
  $routePage = Join-Path $projectRoot ("src\app\(erp)\{0}\page.tsx" -f $segment)
  if (-not (Test-Path -LiteralPath $routePage -PathType Leaf)) {
    $erpRoutesExist = $false
  }
}

Write-Check `
  "ERP route group and navigation targets" `
  ($erpLayout.Contains("AppShell") -and $erpRoutesExist) `
  "ERP pages sit under src/app/(erp)/, share AppShell, and their group name is omitted from URLs."
Write-Check `
  "Future auth boundary without login feature" `
  ($authLayout.Contains("children") -and -not (Test-Path -LiteralPath $authPagePath -PathType Leaf)) `
  "src/app/(auth)/ has a pass-through layout ready for future pages; no login page is present."
Write-Check `
  "Home route keeps dashboard entry point" `
  ($homePage.Contains('redirect("/dashboard")')) `
  "The root URL continues to send users to /dashboard."

# Reusable display states and shared visual patterns.
$skeletons = Read-ProjectFile "src\components\ui\skeleton.tsx"
$emptyState = Read-ProjectFile "src\components\ui\empty-state.tsx"
$errorState = Read-ProjectFile "src\components\ui\error-state.tsx"
$dashboardError = Read-ProjectFile "src\app\(erp)\dashboard\error.tsx"
$badge = Read-ProjectFile "src\components\ui\badge.tsx"
$pageContainer = Read-ProjectFile "src\components\layout\page-container.tsx"

Write-Check `
  "Reusable loading skeletons" `
  ($skeletons.Contains("DashboardSkeleton") -and $skeletons.Contains("KpiCardSkeleton") -and $skeletons.Contains("ChartSkeleton") -and $skeletons.Contains("ListSkeleton")) `
  "Skeleton variants cover the dashboard structure and can be connected when a real loading state is introduced."
Write-Check `
  "Reusable empty and error states" `
  ($emptyState.Contains("export function EmptyState") -and $errorState.Contains("export function ErrorState")) `
  "Shared state components provide consistent empty and failure messaging; error state accepts an optional retry action."
Write-Check `
  "Dashboard error retry boundary" `
  ($dashboardError.Contains("ErrorState") -and $dashboardError.Contains("onRetry={retry}")) `
  "A dashboard rendering failure is contained and offers Next.js route retry behavior."
Write-Check `
  "Theme-aware badges and semantic page heading" `
  ($badge.Contains("var(--primary-soft)") -and $badge.Contains("var(--success-soft)") -and $pageContainer.Contains('aria-labelledby="page-title"') -and $pageContainer.Contains("<h1")) `
  "Badge variants use ERP theme tokens; PageContainer supplies the shared main heading and responsive actions."

$table = Read-ProjectFile "src\components\ui\data-table.tsx"
Write-Check `
  "Reusable accessible table foundation" `
  ($table.Contains("export function DataTable") -and $table.Contains('scope="col"') -and $table.Contains("overflow-x-auto") -and $table.Contains("rowActions") -and $table.Contains("pagination?: ReactNode") -and $table.Contains("EmptyState")) `
  "The generic table supports semantic headers, keyboard-accessible horizontal scrolling, empty content, row actions, and a future pagination slot."
$themeShell = Read-ProjectFile "src\components\layout\app-shell.tsx"
$header = Read-ProjectFile "src\components\layout\app-header.tsx"
$drawer = Read-ProjectFile "src\components\layout\mobile-sidebar.tsx"
$styles = Read-ProjectFile "src\app\globals.css"
Write-Check `
  "Theme preference persistence and hydration" `
  ($themeShell.Contains("useSyncExternalStore") -and $themeShell.Contains("localStorage.getItem") -and $themeShell.Contains("getServerThemeSnapshot") -and $styles.Contains("@custom-variant dark")) `
  "Saved or system theme is synchronized without setting React state in an effect; dark utility styles follow the app's .dark class."
Write-Check `
  "Mobile drawer keyboard and dialog behavior" `
  ($drawer.Contains('role="dialog"') -and $drawer.Contains('aria-modal="true"') -and $drawer.Contains('event.key === "Escape"') -and $drawer.Contains("previouslyFocused?.focus()") -and $drawer.Contains('event.key !== "Tab"')) `
  "The drawer exposes dialog semantics, closes with Escape, contains keyboard focus, and returns focus to its opener."
Write-Check `
  "Focus indicators and responsive drawer state" `
  ($styles.Contains(':focus-visible') -and $header.Contains("aria-expanded={mobileMenuOpen}") -and $drawer.Contains('matchMedia("(min-width: 768px)")')) `
  "Keyboard focus is visible, the menu button reports expanded state, and the drawer closes when resizing to desktop."
$salesTypes = Read-ProjectFile "src\features\sales\types.ts"
$salesDomain = Read-ProjectFile "src\features\sales\domain.ts"
$purchasingTypes = Read-ProjectFile "src\features\purchasing\types.ts"
$purchasingDomain = Read-ProjectFile "src\features\purchasing\domain.ts"
Write-Check `
  "Sales lifecycle and independent status types" `
  ($salesTypes.Contains('"Unpaid"') -and $salesTypes.Contains('"Unfulfilled"') -and $salesDomain.Contains("canEditSalesOrderLines") -and $salesDomain.Contains("canCancelSalesOrder")) `
  "Sales order, payment, and fulfillment tracks are separate; line edits and unshipped cancellation rules live in the feature domain."
Write-Check `
  "Purchasing approval and receiving rules" `
  ($purchasingTypes.Contains('"Pending Approval"') -and $purchasingTypes.Contains('"Partially Received"') -and $purchasingDomain.Contains("canTransitionPurchaseOrderApproval") -and $purchasingDomain.Contains("canTransitionPurchaseOrderReceiving")) `
  "Supplier, approval, receiving, and expected-date policies are defined under the Purchasing feature."

$money = Read-ProjectFile "src\lib\money.ts"
$dateTime = Read-ProjectFile "src\lib\date-time.ts"
$listQuery = Read-ProjectFile "src\lib\list-query.ts"
$permissions = Read-ProjectFile "src\lib\permissions.ts"
$apiEnvelope = Read-ProjectFile "src\lib\api-envelope.ts"
Write-Check `
  "Shared money and timezone-safe date helpers" `
  ($money.Contains("formatMoney") -and $money.Contains("minor-units") -and $dateTime.Contains("formatUtcTimestamp") -and $dateTime.Contains("formatDateOnly")) `
  "Money supports minor units or decimal strings; UTC instants and date-only values use separate formatting paths."
Write-Check `
  "URL-backed list query and claim types" `
  ($listQuery.Contains("parseListQuery") -and $listQuery.Contains("writeListQuery") -and $permissions.Contains("hasPermission") -and $permissions.Contains("suppliers:read-financial")) `
  "List state is bounded and sort-allowlisted; granular claims support UI gating but do not replace backend checks."
Write-Check `
  "Shared API envelope decoder" `
  ($apiEnvelope.Contains("parseApiEnvelope") -and $apiEnvelope.Contains("RuntimeSchema") -and $apiEnvelope.Contains("fieldErrors")) `
  "The common data/meta/error shape is checked and payload validation is delegated to injected runtime schemas."
Write-Host ""
if ($script:failureCount -eq 0) {
  Write-Host ("Result: {0} checks passed." -f $script:checkCount) -ForegroundColor Green
  Write-Host "Next: settle the remaining Inventory UoM and location policies, then implement the first Inventory screen against the approved contracts."
  exit 0
}

Write-Host ("Result: {0} of {1} checks need attention." -f $script:failureCount, $script:checkCount) -ForegroundColor Yellow
Write-Host "Review the failed item and its explanation. This script checks source structure only; it does not prove runtime behavior."
exit 1

