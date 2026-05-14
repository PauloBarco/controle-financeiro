export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string | null) {
  if (!date) return "Sem data";

  const normalizedDate = date.includes("T") ? date : `${date}T00:00:00`;

  return new Date(normalizedDate).toLocaleDateString("pt-BR");
}

export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getCurrentMonthRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    start: formatDateInput(start),
    end: formatDateInput(today),
  };
}

export function getCurrentFullMonthRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    start: formatDateInput(start),
    end: formatDateInput(end),
  };
}

export function getNextDate(date: string) {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + 1);

  return formatDateInput(nextDate);
}
