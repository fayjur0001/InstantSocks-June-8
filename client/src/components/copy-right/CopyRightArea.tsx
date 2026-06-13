"use client";

import { useEffect, useState } from "react";
import { authInfoApi } from "@/lib/api";

const CopyRightArea = () => {
  const currentYear = new Date().getFullYear();
  const [copyrightText, setCopyrightText] = useState<string | null>(null);

  useEffect(() => {
    authInfoApi.get()
      .then(({ data }) => {
        if (data.copyrightText) setCopyrightText(data.copyrightText);
      })
      .catch(() => {});
  }, []);

  const displayText = copyrightText
    ? copyrightText.replace('${year}', String(currentYear))
    : `© ${currentYear} - Present, InstantSocks.`;

  return (
    <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-1 text-center text-c-gray-400 text-sm py-3 absolute bottom-0 left-1/2 transform -translate-x-1/2">
      <p className="text-center text-white/30">{displayText}</p>
      <p className="flex items-center gap-1">
        <a
          href="https://instantsocks.com/terms-conditions/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green/60 hover:underline"
        >
          Terms of Service
        </a>
        <span className="text-white/50 mx-1 text-[8px]">|</span>
        <a
          href="https://instantsocks.com/privacy-policy/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green/60 hover:underline"
        >
          Privacy Policy
        </a>
      </p>
    </div>
  );
};

export default CopyRightArea;