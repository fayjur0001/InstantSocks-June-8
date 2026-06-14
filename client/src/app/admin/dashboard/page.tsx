"use client";

import { useEffect, useState } from "react";
import InfoCardsArea from "@/components/user/pages/dashboard/InfoCardsArea";
import InfoTabs from "@/components/user/pages/dashboard/InfoTabs";
import { publicApi, PublicContentData } from "@/lib/api";

const EMPTY_CONTENT: PublicContentData = {
  notice:             "string",
  rules:              "",
  termsAndConditions: "",
  privacyPolicy:      "",
};

export default function Home() {
  const [content, setContent] = useState<PublicContentData>(EMPTY_CONTENT);

  useEffect(() => {
    publicApi
      .getContent()
      .then(({ data }) => setContent(data))
      .catch((err) => console.error("Failed to load dashboard content:", err));
  }, []);

  return (
    <>
      <InfoCardsArea />
      <InfoTabs
        notice={content.notice}
        rules={content.rules}
        termsAndConditions={content.termsAndConditions}
        privacyPolicy={content.privacyPolicy}
      />
    </>
  );
}