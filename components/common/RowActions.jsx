"use client";
import { Button, Popconfirm, Space, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

// deleteHint: لو الحذف مش مسموح، الزرار يظهر مقفول ومعاه السبب
// الأزرار أيقونات بس، فليها تلميح + aria-label (لقارئ الشاشة)
export default function RowActions({
  onEdit,
  onDelete,
  canDelete = true,
  deleteHint,
}) {
  const t = useTranslations("Common");
  return (
    <Space size={4}>
      {onEdit && (
        <Tooltip title={t("Edit")}>
          <Button
            size="small"
            icon={<EditOutlined />}
            aria-label={t("Edit")}
            onClick={onEdit}
          />
        </Tooltip>
      )}
      {onDelete && canDelete && (
        <Popconfirm
          title={t("DeleteConfirm")}
          okButtonProps={{ danger: true }}
          onConfirm={onDelete}
        >
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            aria-label={t("Delete")}
            title={t("Delete")}
          />
        </Popconfirm>
      )}
      {onDelete && !canDelete && deleteHint && (
        <Tooltip title={deleteHint}>
          <Button
            size="small"
            danger
            disabled
            icon={<DeleteOutlined />}
            aria-label={t("Delete")}
          />
        </Tooltip>
      )}
    </Space>
  );
}
