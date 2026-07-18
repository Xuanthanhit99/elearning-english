import { redirect } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;

  redirect(`/learning-path/lessons/${lessonId}`);
}
