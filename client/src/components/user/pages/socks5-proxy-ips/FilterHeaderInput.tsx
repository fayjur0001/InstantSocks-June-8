import { useEffect, useState } from "react";

const hInputCls = [
  "w-full min-w-[50px] bg-transparent border-none outline-none",
  "text-c-emerald-500 placeholder-emerald-700",
  "focus:placeholder-emerald-900 focus:text-white",
  "text-[12px] font-semibold leading-none",
  "cursor-pointer focus:cursor-text",
  "transition-colors duration-150",
].join(" ");

function FilterHeaderInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const [local, setLocal] = useState(value);

  // Sync when parent clears filters externally
  useEffect(() => { setLocal(value); }, [value]);

  // Debounce: push to parent 400ms after user stops typing
  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== value) onChange(local);
    }, 400);
    return () => clearTimeout(t);
  }, [local, onChange, value]);

  return (
    <input
      className={hInputCls}
      placeholder={placeholder}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export default FilterHeaderInput;