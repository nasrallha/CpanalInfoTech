"use client";

import { Col, Form, Input, Select } from "antd";
import { useTranslations } from "next-intl";

// أنواع رقم المنشأة
export const ID_TYPES = ["CRN", "700", "NAT", "IQA", "OTH"];

// ============================================================
// رقم المنشأة + العنوان الوطني (كلها اختيارية)
// بتتحط جوه <Row> في فورم الشركة الجديدة وفورم التعديل
// dense: الشاشة العريضة (الشركة الجديدة): 4 خانات في الصف
// ============================================================
export default function CompanyIdentityFields({ dense = false }) {
  // مقاس كل خانة: [عادي md، عريض lg]
  const col = (md, lg) => (dense ? { xs: 24, sm: 12, lg } : { xs: 24, md });
  const small = (md, lg) => (dense ? { xs: 8, lg } : { xs: 8, md });
  const t = useTranslations("Companies");
  const tAlerts = useTranslations("Alerts");
  const digits = (n, msg) => [
    {
      pattern: new RegExp(`^\\d{${n}}$`),
      message: tAlerts(msg),
    },
  ];
  return (
    <>
      <Col {...col(8, 6)}>
        <Form.Item name="idType" label={t("IdType")}>
          <Select
            allowClear
            placeholder={t("IdTypePlaceholder")}
            options={ID_TYPES.map((v) => ({
              value: v,
              label: t(`idType.${v}`),
            }))}
          />
        </Form.Item>
      </Col>
      <Col {...col(8, 6)}>
        <Form.Item name="idNumber" label={t("IdNumber")}>
          <Input dir="ltr" maxLength={30} />
        </Form.Item>
      </Col>
      <Col {...col(8, 6)}>
        <Form.Item name="city" label={t("City")}>
          <Input />
        </Form.Item>
      </Col>
      <Col {...col(8, 6)}>
        <Form.Item name="district" label={t("District")}>
          <Input />
        </Form.Item>
      </Col>
      <Col {...col(8, 9)}>
        <Form.Item name="street" label={t("Street")}>
          <Input />
        </Form.Item>
      </Col>
      <Col {...small(4, 5)}>
        <Form.Item
          name="buildingNo"
          label={t("BuildingNo")}
          rules={digits(4, "BuildingNoInvalid")}
        >
          <Input dir="ltr" maxLength={4} />
        </Form.Item>
      </Col>
      <Col {...small(4, 5)}>
        <Form.Item
          name="additionalNo"
          label={t("AdditionalNo")}
          rules={digits(4, "AdditionalNoInvalid")}
        >
          <Input dir="ltr" maxLength={4} />
        </Form.Item>
      </Col>
      <Col {...small(4, 5)}>
        <Form.Item
          name="postalCode"
          label={t("PostalCode")}
          rules={digits(5, "PostalCodeInvalid")}
        >
          <Input dir="ltr" maxLength={5} />
        </Form.Item>
      </Col>
    </>
  );
}
