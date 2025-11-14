import AuthLayout from "@/components/AuthLayout"

export default function AttachmentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthLayout>{children}</AuthLayout>
}
