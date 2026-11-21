"use client";

import { useMemo, useState } from "react";
import { Download, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { POINT_VALUES, type Points, type Question } from "@/lib/types";
import { parseDocx, parseJsonPack } from "@/lib/parsePack";
import { useGame } from "./GameProvider";
import { Button, Dialog, Panel } from "./ui";

const emptyForm = (): Question => ({
  id: 0,
  kind: "trivia",
  category: "",
  points: 100,
  question: "",
  answer: "",
  hint: "",
  options: ["", "", "", ""],
});

export function QuestionBankModal() {
  const { bank, categories, deleteQuestion, dispatch, importQuestions, restoreBundled, saveQuestion, state } =
    useGame();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("الكل");
  const [points, setPoints] = useState<Points | 0>(0);
  const [form, setForm] = useState<Question>(emptyForm);
  const [isNew, setIsNew] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim();
    return bank.filter((question) => {
      if (category !== "الكل" && question.category !== category) return false;
      if (points && question.points !== points) return false;
      if (!needle) return true;
      return (
        question.question.includes(needle) ||
        question.answer.includes(needle) ||
        question.category.includes(needle) ||
        String(question.id) === needle
      );
    });
  }, [bank, category, points, query]);

  if (!state.bankOpen) return null;

  const close = () => dispatch({ type: "TOGGLE_BANK" });

  const write = async (file: File) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const parsed = file.name.toLowerCase().endsWith(".json")
        ? parseJsonPack(await file.text())
        : await parseDocx(await file.arrayBuffer());
      if (parsed.errors.length || !parsed.questions.length) {
        setError(parsed.errors.slice(0, 4).join(" — ") || "لم يُعثر على أسئلة");
        return;
      }
      importQuestions(parsed.questions);
      setSuccess(`تم دمج ${parsed.questions.length} سؤالاً`);
    } catch {
      setError("تعذر قراءة الملف");
    } finally {
      setBusy(false);
    }
  };

  const exportBank = () => {
    const blob = new Blob([JSON.stringify(bank, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "questions.json";
    link.click();
    URL.revokeObjectURL(url);
    setSuccess("تم تنزيل questions.json");
  };

  const submit = () => {
    const message = saveQuestion(form, isNew || form.id === 0);
    setError(message);
    setSuccess(message ? null : isNew || form.id === 0 ? "أُضيف السؤال" : "حُفظ التعديل");
    if (!message && (isNew || form.id === 0)) setForm(emptyForm());
  };

  return (
    <Dialog titleId="bank-title" onClose={close}>
      <Panel className="grid max-h-[min(92dvh,52rem)] w-full max-w-6xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-ink p-4">
          <div>
            <h2 id="bank-title" className="text-xl font-black">بنك الأسئلة</h2>
            <p className="text-xs text-muted">{bank.length} سؤالاً</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="board-btn board-btn-ghost inline-flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
              <Upload size={14} />
              استيراد
              <input
                type="file"
                accept=".json,.docx,application/json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void write(file);
                }}
              />
            </label>
            <Button variant="ghost" onClick={exportBank}>
              <Download size={14} />
              تصدير JSON
            </Button>
            <Button variant="ghost" onClick={restoreBundled}>
              استعادة البنك الأصلي
            </Button>
            <button type="button" aria-label="إغلاق" onClick={close}>
              <X />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <label className="field flex min-w-48 flex-1 items-center gap-2 px-3">
                <Search size={14} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="بحث"
                  className="w-full bg-transparent py-2 outline-none"
                />
              </label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="field px-3 py-2"
              >
                <option value="الكل">كل الفئات</option>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select
                value={points}
                onChange={(event) => setPoints(Number(event.target.value) as Points | 0)}
                className="field px-3 py-2"
              >
                <option value={0}>كل النقاط</option>
                {POINT_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            {busy && <p className="text-sm font-bold text-accent">جارٍ قراءة الملف...</p>}
            {error && <p className="note-danger px-3 py-2 text-sm whitespace-pre-wrap">{error}</p>}
            {success && <p className="note-ok px-3 py-2 text-sm">{success}</p>}
            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border-[3px] border-ink bg-paper">
              {filtered.length === 0 ? (
                <p className="p-6 text-sm text-muted">لا توجد أسئلة مطابقة.</p>
              ) : (
                filtered.map((question) => (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => {
                      setForm(question);
                      setIsNew(false);
                      setConfirmDelete(false);
                      setError(null);
                    }}
                    className={`block w-full border-b-2 border-ink/20 px-3 py-3 text-right hover:bg-accent/10 ${
                      form.id === question.id && !isNew ? "bg-accent/20" : ""
                    }`}
                  >
                    <span className="text-xs font-bold text-accent">
                      {question.id} · {question.category} · {question.points}
                    </span>
                    <span className="mt-1 block text-sm">{question.question}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <form
            className="grid content-start gap-2 overflow-y-auto"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black">{isNew || form.id === 0 ? "سؤال جديد" : `تعديل ${form.id}`}</h3>
              <Button
                variant="ghost"
                onClick={() => {
                  setForm({ ...emptyForm(), category: categories[0] ?? "" });
                  setIsNew(true);
                  setConfirmDelete(false);
                }}
              >
                <Plus size={14} />
                جديد
              </Button>
            </div>
            <Field label="الفئة" value={form.category} onChange={(category) => setForm({ ...form, category })} />
            <label className="grid gap-1 text-xs">
              النقاط
              <select
                value={form.points}
                onChange={(event) => setForm({ ...form, points: Number(event.target.value) as Points })}
                className="field px-3 py-2 text-sm"
              >
                {POINT_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <Field label="السؤال" value={form.question} onChange={(question) => setForm({ ...form, question })} area />
            <Field label="الإجابة" value={form.answer} onChange={(answer) => setForm({ ...form, answer })} />
            <Field label="التلميح" value={form.hint} onChange={(hint) => setForm({ ...form, hint })} area />
            {form.options.map((option, index) => (
              <Field
                key={index}
                label={`الخيار ${index + 1}`}
                value={option}
                onChange={(value) =>
                  setForm({
                    ...form,
                    options: form.options.map((item, itemIndex) => (itemIndex === index ? value : item)) as Question["options"],
                  })
                }
              />
            ))}
            <Button type="submit">حفظ السؤال</Button>
            {!isNew && form.id > 0 && (
              confirmDelete ? (
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    onClick={() => {
                      const message = deleteQuestion(form.id);
                      setError(message);
                      setSuccess(message ? null : "حُذف السؤال");
                      if (!message) {
                        setForm(emptyForm());
                        setIsNew(true);
                        setConfirmDelete(false);
                      }
                    }}
                  >
                    تأكيد الحذف
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                    إلغاء
                  </Button>
                </div>
              ) : (
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={14} />
                  حذف
                </Button>
              )
            )}
          </form>
        </div>
      </Panel>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  area = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  area?: boolean;
}) {
  const className = "field px-3 py-2 text-sm";
  return (
    <label className="grid gap-1 text-xs">
      {label}
      {area ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className={className} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} className={className} />
      )}
    </label>
  );
}
