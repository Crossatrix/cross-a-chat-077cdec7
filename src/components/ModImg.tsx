import { ImgHTMLAttributes, useEffect, useState } from "react";
import { onModsUpdated, resolveTexture } from "@/utils/mods";

interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

/** Image wrapper that applies installed mod texture overrides and re-renders on mod changes. */
const ModImg = ({ src, ...rest }: Props) => {
  const [resolved, setResolved] = useState(() => resolveTexture(src));
  useEffect(() => setResolved(resolveTexture(src)), [src]);
  useEffect(() => onModsUpdated(() => setResolved(resolveTexture(src))), [src]);
  return <img src={resolved} {...rest} />;
};

export default ModImg;
