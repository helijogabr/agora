// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import FeedFilters from "../components/FeedFilters";

describe("FeedFilters - Pairwise Combinations", () => {
  const mockOnApply = vi.fn();

  beforeEach(() => {
    mockOnApply.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  const testCases = [
    { id: 1, city: true,  tag: true,  date: true,  type: true  },
    { id: 2, city: true,  tag: false, date: false, type: false },
    { id: 3, city: false, tag: true,  date: false, type: false },
    { id: 4, city: false, tag: false, date: true,  type: true  },
    { id: 5, city: false, tag: false, date: true,  type: false },
    { id: 6, city: false, tag: false, date: false, type: true  },
  ];

  const MOCK_DATA = {
    cityInput: "  Campinas  ",
    cityExpected: "Campinas",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  };

  testCases.forEach(({ id, city, tag, date, type }) => {
    it(`Caso ${id}: Cidade(${city}), Tag(${tag}), Data(${date}), Tipo(${type})`, () => {
      render(<FeedFilters onApply={mockOnApply} />);

      fireEvent.click(screen.getByText("Filtros"));

      const setupFilter = (
        sectionName: string,
        isActive: boolean,
        fillAction?: (section: HTMLElement) => void
      ) => {
        if (!isActive) return;

        const sectionTitle = screen.getByRole("heading", { name: sectionName });
        const section = sectionTitle.closest("section") as HTMLElement;

        fireEvent.click(within(section).getByRole("button", { name: "Ativar" }));

        if (fillAction) fillAction(section);
      };

      setupFilter("Cidade", city, (section) => {
        const input = within(section).getByPlaceholderText("Ex.: São Paulo");
        fireEvent.change(input, { target: { value: MOCK_DATA.cityInput } });
      });

      setupFilter("Tipo", type, (section) => {
        fireEvent.click(within(section).getByRole("button", { name: "Reclamacao" }));
      });

      setupFilter("Tag", tag, (section) => {
        fireEvent.click(within(section).getByRole("button", { name: "Saúde" }));
      });

      setupFilter("Data", date, (section) => {
        const startInput = within(section).getByLabelText("Início");
        const endInput = within(section).getByLabelText("Fim");

        fireEvent.change(startInput, { target: { value: MOCK_DATA.startDate } });
        fireEvent.change(endInput, { target: { value: MOCK_DATA.endDate } });
      });

      fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));

      expect(mockOnApply).toHaveBeenCalledTimes(1);
      expect(mockOnApply).toHaveBeenCalledWith({
        city: city ? MOCK_DATA.cityExpected : "",
        postTypeIds: type ? [1] : [],
        tagIds: tag ? [1] : [],
        startDate: date ? MOCK_DATA.startDate : "",
        endDate: date ? MOCK_DATA.endDate : "",
      });
    });
  });

  it("Deve ignorar os valores preenchidos se o filtro for desativado antes de aplicar", () => {
    render(<FeedFilters onApply={mockOnApply} />);

    fireEvent.click(screen.getByText("Filtros"));

    const cityTitle = screen.getByRole("heading", { name: "Cidade" });
    const citySection = cityTitle.closest("section") as HTMLElement;

    fireEvent.click(within(citySection).getByRole("button", { name: "Ativar" }));
    const cityInput = within(citySection).getByPlaceholderText("Ex.: São Paulo");
    fireEvent.change(cityInput, { target: { value: "São Paulo" } });

    fireEvent.click(within(citySection).getByRole("button", { name: "Desativar" }));

    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    expect(mockOnApply).toHaveBeenCalledWith(
      expect.objectContaining({
        city: "",
      })
    );
  });
});
