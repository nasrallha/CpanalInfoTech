"use client";

import { UploadOutlined } from "@ant-design/icons";
import { Button, Form, Upload } from "antd";
import { useTranslations } from "next-intl";
import { message } from "@/components/common/feedback";
import { IMAGE_TYPES, MAX_IMAGE_SIZE_MB } from "@/lib/image";

const normFile = (e) => (Array.isArray(e) ? e : e?.fileList);

// حقل رفع صورة واحدة. القيمة = قائمة ملفات antd:
//   ملف جديد: فيه originFileObj | صورة قديمة: فيها url | فاضية: مفيش صورة
// tooltip: الشرح كعلامة استفهام جنب العنوان بدل سطر تحت الحقل (النوافذ المضغوطة)
export default function ImageUploadItem({
  name = "image",
  label,
  extra,
  tooltip,
}) {
  const tc = useTranslations("Common");
  const tAlerts = useTranslations("Alerts");

  const beforeUpload = (file) => {
    if (!IMAGE_TYPES.includes(file.type)) {
      message.error(tAlerts("AllowedImageTypes"));
      return Upload.LIST_IGNORE;
    }
    if (file.size / 1024 / 1024 > MAX_IMAGE_SIZE_MB) {
      message.error(tAlerts("ImageTooLarge"));
      return Upload.LIST_IGNORE;
    }
    // false = متترفعش دلوقتي، تفضل في الفورم لحد الحفظ
    return false;
  };

  return (
    <Form.Item
      name={name}
      label={label}
      extra={extra}
      tooltip={tooltip}
      valuePropName="fileList"
      getValueFromEvent={normFile}
    >
      <Upload
        listType="picture"
        maxCount={1}
        beforeUpload={beforeUpload}
        accept=".png,.jpg,.jpeg,.webp"
      >
        <Button icon={<UploadOutlined />}>{tc("Upload")}</Button>
      </Upload>
    </Form.Item>
  );
}
