// ============================================================
// ثيم antd للوحة كلها: الألوان من theme/colors.js، والمقاسات هنا
// (ارتفاع الحقول والأزرار، الخط، الحواف)
// ============================================================
import { C } from "./colors";

export const antdTheme = {
  token: {
    colorPrimary: C.primary,
    colorInfo: C.info,
    colorLink: C.primaryHover,
    colorLinkHover: C.primary,
    colorText: C.text,
    colorTextSecondary: C.muted,
    colorTextHeading: C.ink,
    colorBorder: C.borderStrong,
    colorBorderSecondary: C.border,
    colorBgLayout: C.bg,
    colorSuccess: C.success,
    colorError: C.danger,
    colorWarning: C.warning,
    controlOutline: C.primaryRing,
    controlItemBgActive: C.primarySoft,
    controlItemBgActiveHover: C.primarySoft2,
    borderRadius: 10,
    // ارتفاع الحقول والأزرار: عادي / صغير (داخل الجداول) / كبير
    controlHeight: 38,
    controlHeightSM: 30,
    controlHeightLG: 44,
    fontSize: 14,
    fontFamily: "var(--font-main), 'Segoe UI', Tahoma, Arial, sans-serif",
    boxShadowTertiary: "0 4px 16px rgba(15, 23, 42, 0.04)",
  },
  components: {
    // الخلفية من globals.css (تدرّج هادي)
    Layout: {
      siderBg: C.sider,
      headerBg: "transparent",
      bodyBg: "transparent",
    },
    Menu: {
      darkItemBg: "transparent",
      darkSubMenuItemBg: "transparent",
      darkItemSelectedBg: C.primaryGlow,
      darkItemSelectedColor: C.primaryLight,
      darkItemHoverBg: "rgba(255, 255, 255, 0.06)",
      itemBorderRadius: 10,
      itemMarginInline: 10,
    },
    Button: {
      fontWeight: 600,
      primaryShadow: "0 1px 2px rgba(15, 118, 110, 0.25)",
      borderRadius: 10,
    },
    Card: { headerFontSize: 15, borderRadiusLG: 12 },
    Table: {
      headerBg: C.surfaceAlt,
      headerColor: C.text3,
      rowHoverBg: C.primarySoft,
      rowSelectedBg: C.primarySoft,
      rowSelectedHoverBg: C.primarySoft2,
      borderColor: C.tableBorder,
      borderRadiusLG: 12,
    },
    Modal: { borderRadiusLG: 14, titleFontSize: 17 },
    Tabs: { itemSelectedColor: C.primaryHover, inkBarColor: C.primary },
    Segmented: { itemSelectedBg: C.surface },
    Tag: { borderRadiusSM: 999 },
    // السويتش (نشط / مفعّل): أخضر
    Switch: { colorPrimary: C.success, colorPrimaryHover: C.successText },
    InputNumber: { controlWidth: 120 },
  },
};
