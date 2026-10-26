import React, { useState } from "react";
import {
  CheckCircle2,
  X,
  Plane,
  Building2,
  Users,
  CreditCard,
  Download,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { TripOption } from "../../types/travel";
import {
  formatPrice,
  formatDateRange,
  PAYMENT_SIMULATION,
} from "@corvax/shared";

interface DemoBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripOption?: TripOption | null;
  totalAmount?: number | null;
}

export const DemoBookingModal: React.FC<DemoBookingModalProps> = ({
  isOpen,
  onClose,
  tripOption,
  totalAmount,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string>(
    PAYMENT_SIMULATION.methods[0]?.id || "sbp"
  );
  const [orderNumber] = useState(
    () =>
      `#${PAYMENT_SIMULATION.orderPrefix}${Math.floor(
        1000 + Math.random() * 9000
      )}`
  );

  if (!isOpen) return null;

  const hotel = tripOption?.hotels?.[0];
  const flight = tripOption?.flights?.[0];
  const pnr = "7W4KL9";
  const effectivePrice = totalAmount ?? tripOption?.total_price ?? 0;

  const handlePrint = () => {
    window.print();
  };

  const selectedMethodObj = PAYMENT_SIMULATION.methods.find(
    (m) => m.id === selectedMethod
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-surface rounded-2xl shadow-xl overflow-hidden border border-surface-border flex flex-col max-h-[92vh] w-full max-w-lg">
        {/* Modal Header */}
        <div className="p-5 pb-4 flex items-center justify-between bg-surface-muted border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-tertiary-light text-tertiary flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-content-primary leading-tight">
                Бронирование подтверждено
              </h3>
              <span className="font-mono text-xs text-primary font-semibold">
                Заявка {orderNumber} • PNR: {pnr}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted hover:text-content-primary hover:bg-surface-subtle transition-colors"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* E-tickets banner */}
          <div className="p-3.5 rounded-xl bg-primary-light border border-primary/30 flex items-start gap-3">
            <Plane className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-content-primary text-xs sm:text-sm">
                Электронные маршрут-квитанции сформированы
              </div>
              <div className="text-xs text-content-secondary mt-0.5 leading-relaxed">
                3 билета {flight?.carrier || "авиакомпании"} привязаны к профилю Алексея С.
                Места 12A, 12B, 12C. Багаж 20 кг включён.
              </div>
            </div>
          </div>

          {/* Details list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 bg-surface-muted rounded-lg">
              <span className="text-content-muted flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Период проживания:</span>
              </span>
              <span className="font-medium text-content-primary">
                {hotel?.check_in && hotel?.check_out
                  ? formatDateRange(hotel.check_in, hotel.check_out)
                  : "14.11 — 21.11 (7 ночей)"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 px-3 bg-surface-muted rounded-lg">
              <span className="text-content-muted flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span>Курорт и отель:</span>
              </span>
              <span className="font-medium text-content-primary text-right truncate max-w-[220px]">
                {hotel?.hotel || tripOption?.destination || "BM Beach Resort 4★"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 px-3 bg-surface-muted rounded-lg">
              <span className="text-content-muted flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>Путешественники:</span>
              </span>
              <span className="font-medium text-content-primary">
                2 взр + 1 реб (Алексей С., Елена С., Марк С.)
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5 px-3 bg-primary-light/60 border border-primary/30 rounded-lg">
              <span className="text-content-primary font-semibold flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-primary" />
                <span>Итоговая стоимость:</span>
              </span>
              <span className="font-mono font-bold text-primary text-base">
                {formatPrice(effectivePrice, tripOption?.currency)} (Тариф зафиксирован)
              </span>
            </div>
          </div>

          {/* Payment simulation method selector */}
          <div>
            <label className="block text-xs font-semibold text-content-primary mb-1.5">
              Способ тестовой оплаты:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_SIMULATION.methods.map((method) => {
                const isSelected = selectedMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    className={`py-2 px-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 border text-center ${
                      isSelected
                        ? "bg-primary-light border-primary text-primary font-semibold ring-2 ring-primary/20 shadow-xs"
                        : "bg-surface hover:bg-surface-muted border-surface-border text-content-secondary"
                    }`}
                  >
                    <span>{method.icon}</span>
                    <span className="truncate">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment simulation disclaimer */}
          <div className="p-3.5 bg-surface-muted rounded-xl border border-surface-border flex items-start gap-2.5 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-tertiary shrink-0 mt-0.5" />
            <div className="text-[11px] text-content-secondary leading-relaxed">
              <strong className="text-content-primary block mb-0.5">
                Авторизация через {selectedMethodObj?.label || "СБП"}
              </strong>
              {PAYMENT_SIMULATION.disclaimer}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-surface-muted border-t border-surface-border flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle border border-surface-border text-content-primary font-semibold text-xs sm:text-sm transition-colors"
          >
            Закрыть окно
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold text-xs sm:text-sm transition-all shadow-xs flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Маршрутная квитанция (PDF)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
