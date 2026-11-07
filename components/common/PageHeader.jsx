"use client";
import { Space } from "antd";

// عنوان الصفحة + الأزرار
export default function PageHeader({ title, subtitle, extra }) {
  return (
    <div className="page-header page-header--card">
      <div>
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <div className="page-header__sub">{subtitle}</div>}
      </div>
      {extra && <Space wrap>{extra}</Space>}
    </div>
  );
}
