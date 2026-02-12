"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { Package, Search, ChevronDown, Filter, Check, X } from "lucide-react";

interface Product {
  id: string;
  cleaned_name: string | null;
  original_name: string | null;
  refined_category: string | null;
  price: number | null;
  current_stock: number | null;
  seasonality: string | null;
  ai_confidence: number | null;
}

export function ProductsTabContent({
  analysisId,
}: {
  analysisId: string | undefined;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryTriggerRef = useRef<HTMLButtonElement>(null);
  const [sortBy, setSortBy] = useState<
    "name" | "price" | "stock" | "category"
  >("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    async function loadProducts() {
      if (!analysisId) {
        setProducts([]);
        setLoading(false);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select(
          "id, cleaned_name, original_name, refined_category, price, current_stock, seasonality, ai_confidence"
        )
        .eq("analysis_id", analysisId)
        .order("cleaned_name", { ascending: true });

      setProducts((data as Product[]) || []);
      setLoading(false);
    }
    loadProducts();
  }, [analysisId]);

  const categories = useMemo(() => {
    const cats = [
      ...new Set(
        products
          .map((p) => p.refined_category)
          .filter((c): c is string => Boolean(c))
      ),
    ];
    return cats.sort();
  }, [products]);

  const filtered = products
    .filter((p) => {
      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(p.refined_category ?? "")
      )
        return false;
      const q = search.toLowerCase();
      return (
        !q ||
        (p.cleaned_name?.toLowerCase().includes(q) ?? false) ||
        (p.original_name?.toLowerCase().includes(q) ?? false) ||
        (p.refined_category?.toLowerCase().includes(q) ?? false)
      );
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortBy) {
        case "name":
          return (
            (a.cleaned_name || a.original_name || "").localeCompare(
              b.cleaned_name || b.original_name || ""
            ) * dir
          );
        case "price":
          return ((a.price ?? 0) - (b.price ?? 0)) * dir;
        case "stock":
          return ((a.current_stock ?? 0) - (b.current_stock ?? 0)) * dir;
        case "category":
          return (
            (a.refined_category || "").localeCompare(
              b.refined_category || ""
            ) * dir
          );
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-card border border-profeta-border bg-profeta-card p-12">
        <div className="animate-pulse text-profeta-text-secondary">
          Carregando produtos...
        </div>
      </div>
    );
  }

  const BRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

  const cols = [
    { key: "name" as const, label: "Produto" },
    { key: "category" as const, label: "Categoria" },
    { key: "price" as const, label: "Preço" },
    { key: "stock" as const, label: "Estoque" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-profeta-text-secondary">
            <span className="font-mono font-semibold text-profeta-text-primary">
              {filtered.length}
            </span>
            {filtered.length !== products.length && (
              <span> de {products.length}</span>
            )}{" "}
            produtos
            {selectedCategories.length === 1 && (
              <span className="text-profeta-text-muted">
                {" "}
                em {selectedCategories[0]}
              </span>
            )}
            {selectedCategories.length > 1 && (
              <span className="text-profeta-text-muted">
                {" "}
                em {selectedCategories.length} categorias
              </span>
            )}
          </p>
          {(search || selectedCategories.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedCategories([]);
              }}
              className="text-xs text-profeta-text-muted transition-colors hover:text-profeta-text-primary"
            >
              Limpar filtros
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-profeta-text-muted" />
            <input
              type="text"
              placeholder="Buscar produto ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-profeta-border bg-white px-4 py-2 pl-9 text-sm text-profeta-text-primary placeholder:text-profeta-text-muted transition-all focus:border-profeta-green focus:outline-none focus:ring-2 focus:ring-profeta-green/20"
            />
          </div>
          {categories.length > 1 && (
            <>
            <div className="relative">
            <button
              ref={categoryTriggerRef}
              type="button"
              onClick={() => setCategoryDropdownOpen((o) => !o)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                selectedCategories.length > 0
                  ? "border-profeta-green bg-profeta-green/5 text-profeta-green"
                  : "border-profeta-border bg-white text-profeta-text-secondary hover:border-profeta-green/50"
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>
                {selectedCategories.length === 0
                  ? "Categoria"
                  : selectedCategories.length === 1
                    ? selectedCategories[0]
                    : `${selectedCategories.length} categorias`}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  categoryDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {categoryDropdownOpen &&
              typeof document !== "undefined" &&
              createPortal(
                <>
                  <div
                    className="fixed inset-0 z-[100]"
                    onClick={() => setCategoryDropdownOpen(false)}
                    aria-hidden
                  />
                  <div
                    className="fixed z-[101] max-h-64 w-64 overflow-y-auto rounded-xl border border-profeta-border bg-white py-1 shadow-lg"
                    style={{
                      top:
                        (categoryTriggerRef.current?.getBoundingClientRect()
                          ?.bottom ?? 0) + 4,
                      left:
                        categoryTriggerRef.current?.getBoundingClientRect()
                          ?.left ?? 0,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-profeta-border px-3 py-2">
                      <span className="text-xs font-medium uppercase tracking-wider text-profeta-text-muted">
                        Categorias
                      </span>
                      {selectedCategories.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedCategories([])}
                          className="text-xs text-profeta-green hover:underline"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    {categories.map((cat) => {
                      const isSelected = selectedCategories.includes(cat);
                      const count = products.filter(
                        (p) => p.refined_category === cat
                      ).length;

                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setSelectedCategories((prev) =>
                              isSelected
                                ? prev.filter((c) => c !== cat)
                                : [...prev, cat]
                            );
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-profeta-surface/50"
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                              isSelected
                                ? "border-profeta-green bg-profeta-green"
                                : "border-profeta-border"
                            }`}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <span
                            className={`flex-1 truncate ${
                              isSelected
                                ? "font-medium text-profeta-text-primary"
                                : "text-profeta-text-secondary"
                            }`}
                          >
                            {cat}
                          </span>
                          <span className="font-mono text-xs text-profeta-text-muted">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>,
                document.body
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedCategories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 rounded-lg bg-profeta-green/10 px-2.5 py-1 text-xs font-medium text-profeta-green"
                >
                  {cat}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCategories((prev) => prev.filter((c) => c !== cat))
                    }
                    className="transition-colors hover:text-profeta-text-primary"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            </>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-profeta-border bg-profeta-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-profeta-border">
              {cols.map((col) => (
                <th
                  key={col.key}
                  onClick={() => {
                    if (sortBy === col.key)
                      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    else {
                      setSortBy(col.key);
                      setSortDir("asc");
                    }
                  }}
                  className="cursor-pointer select-none px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-profeta-text-secondary transition-colors hover:text-profeta-text-primary"
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortBy === col.key && (
                      <ChevronDown
                        className={`h-3 w-3 transition-transform ${
                          sortDir === "desc" ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-profeta-text-secondary">
                Sazonalidade
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-profeta-text-secondary">
                Qualidade
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product, i) => {
              const qualityScore =
                product.ai_confidence != null ? product.ai_confidence : null;
              return (
                <tr
                  key={product.id}
                  className={`border-b border-profeta-border/50 transition-colors hover:bg-profeta-surface/50 ${
                    i % 2 === 0 ? "" : "bg-profeta-surface/30"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-profeta-surface">
                        <Package className="h-4 w-4 text-profeta-green" />
                      </div>
                      <div>
                        <p className="max-w-[200px] truncate text-sm font-medium text-profeta-text-primary">
                          {product.cleaned_name || product.original_name || "—"}
                        </p>
                        {product.cleaned_name &&
                          product.original_name &&
                          product.cleaned_name !== product.original_name && (
                            <p className="max-w-[200px] truncate text-xs text-profeta-text-muted">
                              {product.original_name}
                            </p>
                          )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-profeta-surface px-2.5 py-0.5 text-xs font-medium text-profeta-text-secondary">
                      {product.refined_category || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-profeta-text-primary">
                      {product.price != null
                        ? BRL.format(product.price)
                        : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-profeta-text-primary">
                      {product.current_stock != null
                        ? product.current_stock
                        : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-profeta-text-secondary">
                      {product.seasonality || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {qualityScore != null ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-profeta-surface">
                          <div
                            className={`h-full rounded-full transition-all ${
                              qualityScore >= 0.8
                                ? "bg-profeta-green"
                                : qualityScore >= 0.5
                                  ? "bg-profeta-amber"
                                  : "bg-profeta-red"
                            }`}
                            style={{ width: `${qualityScore * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs text-profeta-text-muted">
                          {Math.round(qualityScore * 100)}%
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center">
            <Package className="mx-auto mb-2 h-8 w-8 text-profeta-text-muted" />
            <p className="text-sm text-profeta-text-secondary">
              {search
                ? "Nenhum produto encontrado para essa busca."
                : selectedCategories.length > 0
                  ? "Nenhum produto nas categorias selecionadas."
                  : "Nenhum produto na análise."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
