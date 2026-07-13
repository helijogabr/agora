import { useState } from "react";

type FilterKey = "city" | "type" | "tag" | "date";

type FilterOption = {
  id: number;
  name: string;
};

type FilterPayload = {
  city: string;
  postTypeIds: number[];
  tagIds: number[];
  startDate: string;
  endDate: string;
};

type Props = {
  postTypes?: FilterOption[];
  tags?: FilterOption[];
  onApply?: (filters: FilterPayload) => void;
};

const DEFAULT_POST_TYPES: FilterOption[] = [
  { id: 1, name: "Reclamacao" },
  { id: 2, name: "Sugestao" },
  { id: 3, name: "Denuncia" },
  { id: 4, name: "Elogio" },
  { id: 5, name: "Duvida" },
  { id: 6, name: "Aviso/Comunicado" },
];

const DEFAULT_TAGS: FilterOption[] = [
  { id: 1, name: "Saúde" },
  { id: 2, name: "Educação" },
  { id: 3, name: "Segurança" },
  { id: 4, name: "Transporte" },
  { id: 5, name: "Meio Ambiente" },
];

function ToggleButton({
  active,
  onToggle,
  label,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
        active
          ? "border-sky-600 bg-sky-600 text-white"
          : "border-gray-400 bg-white text-gray-700 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-200"
      }`}
      onClick={onToggle}
    >
      {label}
    </button>
  );
}

export default function FeedFilters({
  postTypes = DEFAULT_POST_TYPES,
  tags = DEFAULT_TAGS,
  onApply,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<FilterKey, boolean>>({
    city: false,
    type: false,
    tag: false,
    date: false,
  });
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTypeIds, setSelectedTypeIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const toggleFilter = (filter: FilterKey) => {
    setActiveFilters((current) => ({
      ...current,
      [filter]: !current[filter],
    }));
  };

  const toggleSelection = (
    value: number,
    selectedIds: number[],
    setSelectedIds: (value: number[]) => void,
  ) => {
    setSelectedIds(
      selectedIds.includes(value)
        ? selectedIds.filter((item) => item !== value)
        : [...selectedIds, value],
    );
  };

  const handleApply = () => {
    onApply?.({
      city: activeFilters.city ? city.trim() : "",
      postTypeIds: activeFilters.type ? selectedTypeIds : [],
      tagIds: activeFilters.tag ? selectedTagIds : [],
      startDate: activeFilters.date ? startDate : "",
      endDate: activeFilters.date ? endDate : "",
    });
  };

  return (
    <div className="w-full max-w-2xl rounded border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded bg-gray-100 px-3 py-2 text-left text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>Filtros</span>
        <span>{isOpen ? "▾" : "▸"}</span>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <section className="min-w-56 flex-1 rounded border border-gray-200 p-3 dark:border-gray-700">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Cidade</h3>
                <ToggleButton
                  active={activeFilters.city}
                  onToggle={() => toggleFilter("city")}
                  label={activeFilters.city ? "Desativar" : "Ativar"}
                />
              </div>
              {activeFilters.city ? (
                <input
                  type="text"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Ex.: São Paulo"
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ative este filtro para buscar por cidade.
                </p>
              )}
            </section>

            <section className="min-w-56 flex-1 rounded border border-gray-200 p-3 dark:border-gray-700">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Tipo</h3>
                <ToggleButton
                  active={activeFilters.type}
                  onToggle={() => toggleFilter("type")}
                  label={activeFilters.type ? "Desativar" : "Ativar"}
                />
              </div>
              {activeFilters.type ? (
                <div className="flex flex-wrap gap-2">
                  {postTypes.map((type) => {
                    const isSelected = selectedTypeIds.includes(type.id);

                    return (
                      <button
                        key={type.id}
                        type="button"
                        className={`rounded-full border px-2.5 py-1 text-sm ${
                          isSelected
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                        onClick={() =>
                          toggleSelection(type.id, selectedTypeIds, setSelectedTypeIds)
                        }
                      >
                        {type.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ative este filtro para escolher um tipo de postagem.
                </p>
              )}
            </section>

            <section className="min-w-56 flex-1 rounded border border-gray-200 p-3 dark:border-gray-700">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Tag</h3>
                <ToggleButton
                  active={activeFilters.tag}
                  onToggle={() => toggleFilter("tag")}
                  label={activeFilters.tag ? "Desativar" : "Ativar"}
                />
              </div>
              {activeFilters.tag ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={`rounded-full border px-2.5 py-1 text-sm ${
                          isSelected
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                        onClick={() => toggleSelection(tag.id, selectedTagIds, setSelectedTagIds)}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ative este filtro para escolher uma ou mais tags.
                </p>
              )}
            </section>

            <section className="min-w-56 flex-1 rounded border border-gray-200 p-3 dark:border-gray-700">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Data</h3>
                <ToggleButton
                  active={activeFilters.date}
                  onToggle={() => toggleFilter("date")}
                  label={activeFilters.date ? "Desativar" : "Ativar"}
                />
              </div>
              {activeFilters.date ? (
                <div className="space-y-2">
                  <label className="block text-sm text-gray-600 dark:text-gray-300">
                    <span className="mb-1 block">Início</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                    />
                  </label>
                  <label className="block text-sm text-gray-600 dark:text-gray-300">
                    <span className="mb-1 block">Fim</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                    />
                  </label>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ative este filtro para definir um intervalo de data.
                </p>
              )}
            </section>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleApply}
              className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
