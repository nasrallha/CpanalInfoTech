"use client";

import { useEffect, useState } from "react";
import { Button, Dropdown, Grid, Layout, Menu } from "antd";
import {
  ApartmentOutlined,
  AppstoreOutlined,
  AuditOutlined,
  CloudSyncOutlined,
  DatabaseOutlined,
  CreditCardOutlined,
  CarOutlined,
  IdcardOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useAuth } from "@/components/common/AuthProvider";
import { logoutAction } from "@/actions/auth.actions";
import LanguageSwitcher from "./LanguageSwitcher";

const { Sider, Header, Content } = Layout;

const LINKS = [
  { href: "/", key: "Dashboard", icon: <DashboardOutlined /> },
  {
    href: "/companies",
    key: "Companies",
    icon: <ShopOutlined />,
    perm: "companies.view",
  },
  {
    href: "/plans",
    key: "Plans",
    icon: <AppstoreOutlined />,
    perm: "plans.view",
  },

  {
    href: "/role-templates",
    key: "RoleTemplates",
    icon: <IdcardOutlined />,
    perm: "roleTemplates.manage",
  },
  {
    href: "/payment-templates",
    key: "PaymentTemplates",
    icon: <CreditCardOutlined />,
    perm: "paymentTemplates.manage",
  },
  {
    href: "/sales-channels",
    key: "SalesChannels",
    icon: <CarOutlined />,
    perm: "salesChannels.manage",
  },
  {
    href: "/activities",
    key: "Activities",
    icon: <ApartmentOutlined />,
    perm: "activities.manage",
  },
  {
    href: "/staff",
    key: "Staff",
    icon: <TeamOutlined />,
    perm: "staff.manage",
  },
  {
    href: "/roles",
    key: "Roles",
    icon: <SafetyCertificateOutlined />,
    perm: "staff.manage",
  },
  {
    href: "/updates",
    key: "Updates",
    icon: <CloudSyncOutlined />,
    perm: "companies.provision",
  },
  {
    href: "/backups",
    key: "Backups",
    icon: <DatabaseOutlined />,
    perm: "backups.manage",
  },
  { href: "/audit", key: "Audit", icon: <AuditOutlined />, perm: "audit.view" },
  {
    href: "/settings",
    key: "Settings",
    icon: <SettingOutlined />,
    perm: "settings.manage",
  },
];

export default function PanelShell({ children }) {
  const t = useTranslations("Nav");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { user, can } = useAuth();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const [collapsed, setCollapsed] = useState(false);
  const hidden = isMobile ? true : collapsed;
  const [mobileOpen, setMobileOpen] = useState(false);
  const siderCollapsed = isMobile ? !mobileOpen : hidden;

  // Esc بيقفل القايمة على الموبايل
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const links = LINKS.filter((l) => !l.perm || can(l.perm));
  const selected =
    links
      .filter((l) =>
        l.href === "/" ? pathname === "/" : pathname.startsWith(l.href),
      )
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? "/";

  const logout = async () => {
    await logoutAction();
    router.replace("/login");
  };

  const name = locale === "ar" ? user?.arName : user?.enName;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {isMobile && mobileOpen && (
        <div
          className="cp-backdrop"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <Sider
        width={240}
        collapsedWidth={isMobile ? 0 : 72}
        collapsed={siderCollapsed}
        trigger={null}
        style={{
          height: "100vh",
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          insetInlineStart: 0,
          zIndex: isMobile ? 1001 : undefined,
          overflow: "auto",
        }}
      >
        <div className="cp-logo">
          <span className="cp-logo__mark">
            <SafetyCertificateOutlined />
          </span>
          {!siderCollapsed && <span>{tc("AppShort")}</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selected]}
          onClick={() => isMobile && setMobileOpen(false)}
          items={links.map((l) => ({
            key: l.href,
            icon: l.icon,
            label: <Link href={l.href}>{t(l.key)}</Link>,
          }))}
        />
      </Sider>
      <Layout>
        <Header className="cp-header">
          <Button
            type="text"
            aria-label={tc("ToggleMenu")}
            icon={
              siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
            }
            onClick={() =>
              isMobile ? setMobileOpen(!mobileOpen) : setCollapsed(!collapsed)
            }
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <LanguageSwitcher />
            <Dropdown
              trigger={["click"]}
              getPopupContainer={(node) => node.parentElement ?? document.body}
              menu={{
                items: [
                  {
                    key: "role",
                    disabled: true,
                    label: user?.isOwner
                      ? tc("Owner")
                      : ((locale === "ar"
                          ? user?.role?.arName
                          : user?.role?.enName) ?? ""),
                  },
                  { type: "divider" },
                  {
                    key: "logout",
                    icon: <LogoutOutlined />,
                    danger: true,
                    label: tc("Logout"),
                    onClick: logout,
                  },
                ],
              }}
            >
              {/* على الموبايل الأيقونة بس */}
              <Button
                type="text"
                icon={<UserOutlined />}
                aria-label={name || tc("Account")}
              >
                {!isMobile && <span className="cp-header__user-name">{name}</span>}
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content className="cp-content">{children}</Content>
      </Layout>
    </Layout>
  );
}
