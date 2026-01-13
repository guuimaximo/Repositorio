// src/components/desempenho/Evidencias.jsx
import React from "react";

function isImage(url) {
  return /\.(jpg|jpeg|png|webp)$/i.test(String(url || ""));
}
function isPdf(url) {
  return /\.pdf$/i.test(String(url || ""));
}
function getFileName(url) {
  try {
    return decodeURIComponent(String(url || "").split("/").pop() || "");
  } catch {
    return String(url || "").split("/").pop() || "";
  }
}

export function EvidenceList({ urls }) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  if (list.length === 0) return <span className="text-sm text-gray-500">Sem evidências</span>;

  return (
    <div className="flex flex-wrap gap-3">
      {list.map((u, idx) => (
        <a
          key={`${u}-${idx}`}
          href={u}
          target="_blank"
          rel="noopener noreferrer"
          className="border rounded-lg p-2 hover:bg-gray-50 transition"
          title="Abrir arquivo"
        >
          {isImage(u) ? (
            <img src={u} alt="Evidência" className="w-24 h-24 object-cover rounded" loading="lazy" />
          ) : isPdf(u) ? (
            <div className="w-24 h-24 flex flex-col items-center justify-center text-[11px] text-gray-700">
              <span className="text-red-600 font-semibold">PDF</span>
              <span className="mt-1 text-center break-all line-clamp-3">{getFileName(u) || "arquivo.pdf"}</span>
            </div>
          ) : (
            <div className="w-24 h-24 flex items-center justify-center text-[11px] text-gray-700 text-center break-all">
              {getFileName(u) || "arquivo"}
            </div>
          )}
        </a>
      ))}
    </div>
  );
}
