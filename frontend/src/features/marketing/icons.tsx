import type { Icon } from "@phosphor-icons/react";
import { Buildings } from "@phosphor-icons/react/dist/ssr/Buildings";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { ChartBar } from "@phosphor-icons/react/dist/ssr/ChartBar";
import { ChartLineUp } from "@phosphor-icons/react/dist/ssr/ChartLineUp";
import { ChatCircle } from "@phosphor-icons/react/dist/ssr/ChatCircle";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { CircleDashed } from "@phosphor-icons/react/dist/ssr/CircleDashed";
import { Circle } from "@phosphor-icons/react/dist/ssr/Circle";
import { ClipboardText } from "@phosphor-icons/react/dist/ssr/ClipboardText";
import { Code } from "@phosphor-icons/react/dist/ssr/Code";
import { GearSix } from "@phosphor-icons/react/dist/ssr/GearSix";
import { Handshake } from "@phosphor-icons/react/dist/ssr/Handshake";
import { Headset } from "@phosphor-icons/react/dist/ssr/Headset";
import { Megaphone } from "@phosphor-icons/react/dist/ssr/Megaphone";
import { Palette } from "@phosphor-icons/react/dist/ssr/Palette";
import { RocketLaunch } from "@phosphor-icons/react/dist/ssr/RocketLaunch";
import { ShieldCheck } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { Timer } from "@phosphor-icons/react/dist/ssr/Timer";
import { TreeStructure } from "@phosphor-icons/react/dist/ssr/TreeStructure";
import { UsersThree } from "@phosphor-icons/react/dist/ssr/UsersThree";
import { Wallet } from "@phosphor-icons/react/dist/ssr/Wallet";

/**
 * The icons of the marketing page. They are the same in every language and are matched to the copy (copy.*.ts) by
 * position, so the order here must follow the order of the items there.
 */

/** Department-style icons that ride the orbits behind the hero (the same set the sign-in page uses). */
export const ORBIT_ICONS: Icon[] = [Code, ChartBar, UsersThree, Megaphone, Wallet, Headset, GearSix, ShieldCheck, RocketLaunch];

/** One per feature card, in the order of `features.items`. */
export const FEATURE_ICONS: Icon[] = [
  ClipboardText, // assign and track work
  ChartLineUp, // KPIs and statistics
  Handshake, // cross-department projects
  TreeStructure, // structure and permissions
  ChatCircle, // internal messaging
  CalendarBlank, // calendar and business trips
  Timer, // notes and focus
  Palette, // work your way
  Buildings, // company page
];

/** One per column of the task-board illustration, in the order of `glimpse.columns`. */
export const COLUMN_ICONS: Icon[] = [CircleDashed, Circle, CheckCircle];
