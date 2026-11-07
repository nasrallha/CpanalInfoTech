"use client";

import { useState } from "react";
import { Form } from "antd";
import { useTranslations } from "next-intl";
import { message } from "@/components/common/feedback";
import { showActionError } from "@/components/common/actionError";

// ============================================================
// نافذة إضافة/تعديل لأي جدول بسيط
// const crud = useCrud({ create, update, remove, toForm })
//   crud.openNew(initial) / crud.openEdit(row) / crud.submit / crud.remove(row)
// الاستخدام في الشاشة:
//   <Modal open={crud.open} destroyOnHidden ...>
//     <Form form={crud.form} key={crud.formKey} preserve={false} initialValues={crud.initialValues}>
// - preserve={false}: لما النافذة تتقفل الفورم بيتمسح، فالإضافة الجاية تفتح فاضية
//   (من غيرها الـ form بيفتكر آخر قيم اتكتبت وتظهر تاني)
// - القيم بتتحط في initialValues (مش بـ form.setFieldsValue) والفورم بيتعمل
//   من جديد مع كل فتح، فمفيش تحذير "useForm is not connected"
//   ولا مشكلة hydration (النافذة مش بتترسم غير لما تتفتح)
// ============================================================
export function useCrud({
  create,
  update,
  remove,
  toForm = (r) => r,
  toPayload = (v) => v,
  // بعد الحفظ (نتيجة الـ action): مثلاً تحذير بالشركات اللي التعديل مااتطبّقش عندها
  onSaved,
}) {
  const tAlerts = useTranslations("Alerts");
  const tc = useTranslations("Common");
  const [form] = Form.useForm();
  // null = مقفولة، {} = جديد، row = تعديل
  const [editing, setEditing] = useState(null);
  const [initialValues, setInitialValues] = useState({});
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const openNew = (initial = {}) => {
    setInitialValues(initial);
    setFormKey((k) => k + 1);
    setEditing({});
  };
  const openEdit = (row) => {
    setInitialValues(toForm(row));
    setFormKey((k) => k + 1);
    setEditing(row);
  };
  const close = () => setEditing(null);

  const submit = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    const payload = toPayload(values);
    // payload ممكن يبقى FormData (لو فيه ملف صورة)
    if (editing?.id && payload instanceof FormData)
      payload.set("id", String(editing.id));
    const res = editing?.id
      ? await update(
          payload instanceof FormData
            ? payload
            : { ...payload, id: editing.id },
        )
      : await create(payload);
    setSaving(false);
    if (!res.success) return showActionError(res, tAlerts, form);
    message.success(tc("Saved"));
    close();
    onSaved?.(res.data);
  };

  const removeRow = async (row) => {
    const res = await remove({ id: row.id });
    if (!res.success) return showActionError(res, tAlerts);
    message.success(tc("Deleted"));
  };

  return {
    form,
    formKey,
    initialValues,
    current: editing,
    open: editing !== null,
    isEdit: Boolean(editing?.id),
    saving,
    openNew,
    openEdit,
    close,
    submit,
    remove: removeRow,
  };
}
