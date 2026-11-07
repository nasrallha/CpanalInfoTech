import { Skeleton } from "antd";

export default function Loading() {
  return (
    <div style={{ padding: 16 }}>
      <Skeleton active paragraph={{ rows: 8 }} />
    </div>
  );
}
