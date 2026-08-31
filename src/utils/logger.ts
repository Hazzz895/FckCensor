import addonConfig from '../../addon.config.mjs'
import { numberToHsl } from './common';
import { getCurrentTraceLine } from './hook-utils';

const baseStyle = "color: black; font-weight: bold; border-radius: 4px; padding: 1px 6px; font-family: 'YSMusic Headline', sans-serif; ";
const style = baseStyle + "background-color: lightgreen;";

const args = ["%c" + addonConfig.name, style]

export const log = console.log.bind(console,  ...args)

export const warn = console.warn.bind(console,  ...args)

export const error = console.error.bind(console,  ...args)

export function debug(...args: any) {
  return console.debug(...__formatDebugArgs(), ...args);
}

export function __formatDebugArgs() {
  const line = getCurrentTraceLine();
  return [
    "%c" + addonConfig.name + "%c [D]",
    baseStyle + `background-color: ${numberToHsl(line)}`,
    baseStyle + 'background-color: lightgreen'
  ];
}