import {
  Buildings,
  ChartBar,
  Code,
  Gear,
  Headset,
  Megaphone,
  RocketLaunch,
  ShieldCheck,
  UsersThree,
  Wallet,
  type Icon,
} from "@phosphor-icons/react";
import type { Department } from "./types";

/** Must stay in step with DepartmentAppearance.java: the server only accepts these keys. */
export const DEPARTMENT_COLORS = {
  indigo: { label: "Chàm", tile: "from-indigo-500 to-indigo-700", swatch: "bg-indigo-500" },
  violet: { label: "Tím", tile: "from-violet-500 to-violet-700", swatch: "bg-violet-500" },
  sky: { label: "Xanh trời", tile: "from-sky-500 to-sky-700", swatch: "bg-sky-500" },
  teal: { label: "Xanh ngọc", tile: "from-teal-500 to-teal-700", swatch: "bg-teal-500" },
  emerald: { label: "Xanh lá", tile: "from-emerald-500 to-emerald-700", swatch: "bg-emerald-500" },
  amber: { label: "Hổ phách", tile: "from-amber-500 to-amber-700", swatch: "bg-amber-500" },
  rose: { label: "Hồng", tile: "from-rose-500 to-rose-700", swatch: "bg-rose-500" },
  slate: { label: "Xám", tile: "from-slate-500 to-slate-700", swatch: "bg-slate-500" },
} as const;

export const DEPARTMENT_ICONS = {
  building: { label: "Toà nhà", Icon: Buildings },
  code: { label: "Kỹ thuật", Icon: Code },
  chart: { label: "Số liệu", Icon: ChartBar },
  users: { label: "Con người", Icon: UsersThree },
  megaphone: { label: "Truyền thông", Icon: Megaphone },
  wallet: { label: "Tài chính", Icon: Wallet },
  headset: { label: "Chăm sóc khách", Icon: Headset },
  gear: { label: "Vận hành", Icon: Gear },
  shield: { label: "Bảo mật", Icon: ShieldCheck },
  rocket: { label: "Sản phẩm", Icon: RocketLaunch },
} as const satisfies Record<string, { label: string; Icon: Icon }>;

export type DepartmentColorKey = keyof typeof DEPARTMENT_COLORS;
export type DepartmentIconKey = keyof typeof DEPARTMENT_ICONS;

const DEFAULT_TILE = "from-primary to-primaryEnd";

function isColorKey(value: string | null | undefined): value is DepartmentColorKey {
  return value != null && value in DEPARTMENT_COLORS;
}

function isIconKey(value: string | null | undefined): value is DepartmentIconKey {
  return value != null && value in DEPARTMENT_ICONS;
}

/** Ready-made starting points: pick one to fill in the name, colour and icon, then adjust as you like. */
export const DEPARTMENT_PRESETS: {
  name: string;
  color: DepartmentColorKey;
  icon: DepartmentIconKey;
}[] = [
  { name: "Kỹ thuật", color: "sky", icon: "code" },
  { name: "Kinh doanh", color: "emerald", icon: "chart" },
  { name: "Nhân sự", color: "rose", icon: "users" },
  { name: "Truyền thông", color: "amber", icon: "megaphone" },
  { name: "Tài chính", color: "teal", icon: "wallet" },
  { name: "Chăm sóc khách hàng", color: "violet", icon: "headset" },
  { name: "Vận hành", color: "slate", icon: "gear" },
  { name: "An ninh", color: "indigo", icon: "shield" },
  { name: "Sản phẩm", color: "violet", icon: "rocket" },
];

/** The square badge of a department: its icon (or initial) on its colour. */
export function DepartmentAvatar({
  department,
  size = "md",
}: {
  department: Pick<Department, "name" | "color" | "icon">;
  size?: "md" | "lg";
}) {
  const tile = isColorKey(department.color)
    ? DEPARTMENT_COLORS[department.color].tile
    : DEFAULT_TILE;
  const dimension = size === "lg" ? "h-12 w-12 text-lg" : "h-10 w-10 text-sm";
  const iconSize = size === "lg" ? 26 : 22;
  const IconComponent = isIconKey(department.icon) ? DEPARTMENT_ICONS[department.icon].Icon : null;
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br font-semibold text-white ${tile} ${dimension}`}
      aria-hidden
    >
      {IconComponent ? (
        <IconComponent size={iconSize} weight="duotone" />
      ) : (
        department.name.charAt(0).toUpperCase()
      )}
    </span>
  );
}

interface PickerValue {
  name: string;
  color: string;
  icon: string;
}

/** Preset chips plus colour and icon pickers; "" means the default look. */
export function DepartmentAppearancePicker({
  value,
  onChange,
  showPresets = false,
}: {
  value: PickerValue;
  onChange: (value: PickerValue) => void;
  showPresets?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {showPresets && (
        <div>
          <p className="mb-1 text-sm font-medium text-fg-soft">Gợi ý nhanh</p>
          <div className="flex flex-wrap gap-1.5">
            {DEPARTMENT_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() =>
                  onChange({ name: preset.name, color: preset.color, icon: preset.icon })
                }
                className="rounded-full border border-line px-2.5 py-1 text-xs text-fg-soft transition-colors duration-150 hover:border-primary hover:text-primary-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-1 text-sm font-medium text-fg-soft">Màu</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Màu phòng ban">
          <button
            type="button"
            onClick={() => onChange({ ...value, color: "" })}
            aria-pressed={value.color === ""}
            className={`rounded-full border px-2.5 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
              value.color === "" ? "border-primary text-primary-text" : "border-line text-fg-soft"
            }`}
          >
            Mặc định
          </button>
          {(Object.keys(DEPARTMENT_COLORS) as DepartmentColorKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ ...value, color: key })}
              aria-pressed={value.color === key}
              aria-label={DEPARTMENT_COLORS[key].label}
              title={DEPARTMENT_COLORS[key].label}
              className={`h-7 w-7 rounded-full ${DEPARTMENT_COLORS[key].swatch} transition-transform duration-150 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                value.color === key ? "ring-2 ring-primary ring-offset-2 ring-offset-white" : ""
              }`}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-fg-soft">Biểu tượng</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Biểu tượng phòng ban">
          <button
            type="button"
            onClick={() => onChange({ ...value, icon: "" })}
            aria-pressed={value.icon === ""}
            className={`rounded-full border px-2.5 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
              value.icon === "" ? "border-primary text-primary-text" : "border-line text-fg-soft"
            }`}
          >
            Chữ cái đầu
          </button>
          {(Object.keys(DEPARTMENT_ICONS) as DepartmentIconKey[]).map((key) => {
            const { Icon: IconComponent, label } = DEPARTMENT_ICONS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ ...value, icon: key })}
                aria-pressed={value.icon === key}
                aria-label={label}
                title={label}
                className={`flex h-8 w-8 items-center justify-center rounded border transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  value.icon === key
                    ? "border-primary bg-primary/10 text-primary-text"
                    : "border-line text-fg-soft hover:border-primary"
                }`}
              >
                <IconComponent size={18} aria-hidden />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DepartmentAvatar
          department={{
            name: value.name || "?",
            color: value.color || null,
            icon: value.icon || null,
          }}
        />
        <p className="text-xs text-fg-muted">Xem trước</p>
      </div>
    </div>
  );
}
