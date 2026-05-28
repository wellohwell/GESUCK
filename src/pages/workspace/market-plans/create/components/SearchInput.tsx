import React from "react";
import { Search, X } from "lucide-react";
import { toTitleCase } from "../../../../../utils/format";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange }) => {
  return (
    <div className="relative group/search w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30 group-focus-within/search:text-primary transition-colors" />
      <input
        type="text"
        placeholder="Cari pasar atau wilayah..."
        value={value}
        onChange={(e) => onChange(toTitleCase(e.target.value))}
        className="w-full bg-muted/30 border border-border/20 rounded-[1.25rem] pl-9 pr-4 h-10 text-[10px] font-bold outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all text-foreground placeholder:text-muted-foreground/20"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-3 h-3 text-muted-foreground/40" />
        </button>
      )}
    </div>
  );
};
