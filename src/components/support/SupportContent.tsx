import { Fragment, ReactNode } from "react";

/**
 * Renders support page text with markdown-style images and links:
 *  ![alt](https://...)  -> image
 *  [label](https://...) -> link
 *  bare https://... URLs -> link
 */
const TOKEN = /(!?)\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)/g;

const isSafe = (url: string) => /^https?:\/\//i.test(url);

export const SupportContent = ({ text }: { text: string }) => {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) out.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    const [full, bang, label, url, bare] = m;

    if (bare) {
      out.push(
        <a key={key++} href={bare} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
          {bare}
        </a>,
      );
    } else if (bang === "!" && isSafe(url)) {
      out.push(
        <img
          key={key++}
          src={url}
          alt={label || "Support image"}
          loading="lazy"
          className="my-3 max-h-96 w-full rounded-md border object-contain"
        />,
      );
    } else if (isSafe(url)) {
      out.push(
        <a key={key++} href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline break-words">
          {label || url}
        </a>,
      );
    } else {
      out.push(<Fragment key={key++}>{full}</Fragment>);
    }
    last = m.index + full.length;
  }
  if (last < text.length) out.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);

  return <div className="whitespace-pre-wrap text-sm leading-relaxed">{out}</div>;
};

export default SupportContent;
