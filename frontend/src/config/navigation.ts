
import {
    ChartNoAxesCombined,
    LayoutDashboard,
    Package,
    Settings,
    ShoppingCart,
    Truck,
    type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    label: "WORKSPACE",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { label: "Inventory", href: "/inventory", icon: Package },
      { label: "Sales", href: "/sales", icon: ShoppingCart },
      { label: "Purchasing", href: "/purchasing", icon: Truck },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      {
        label: "Reports",
        href: "/reports",
        icon: ChartNoAxesCombined,
      },
    ],
  },
  {
    label: "PREFERENCES",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];
