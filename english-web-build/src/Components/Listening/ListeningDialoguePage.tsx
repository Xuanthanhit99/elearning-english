"use client";

import ListeningTopicPage from "./ListeningTopicPage";

/*
 * Backend hiện dùng cùng engine ListeningQuestion A/B/C/D cho
 * hội thoại và bài nói. Vì vậy màn "Nghe hiểu đoạn" dùng chung
 * flow chọn level/topic và start practice.
 */
export default function ListeningDialoguePage() {
  return <ListeningTopicPage />;
}
