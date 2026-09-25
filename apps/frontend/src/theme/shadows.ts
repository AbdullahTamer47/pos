import type { PaletteMode } from '@mui/material';

export function shadows(mode: PaletteMode): string[] {
  const color = mode === 'dark' ? '0,0,0' : '15,23,42';
  const opacity = mode === 'dark' ? 0.3 : 0.06;

  return [
    'none',
    `0px 1px 2px 0px rgba(${color},${(opacity * 1).toFixed(2)}), 0px 1px 3px 0px rgba(${color},${(opacity * 1.5).toFixed(2)})`,
    `0px 1px 2px 0px rgba(${color},${(opacity * 1).toFixed(2)}), 0px 2px 6px 0px rgba(${color},${(opacity * 1.5).toFixed(2)})`,
    `0px 1px 3px 0px rgba(${color},${(opacity * 1).toFixed(2)}), 0px 4px 8px 0px rgba(${color},${(opacity * 1.5).toFixed(2)})`,
    `0px 2px 3px 0px rgba(${color},${(opacity * 1).toFixed(2)}), 0px 6px 10px 0px rgba(${color},${(opacity * 1.5).toFixed(2)})`,
    `0px 4px 4px 0px rgba(${color},${(opacity * 1).toFixed(2)}), 0px 8px 12px 0px rgba(${color},${(opacity * 1.5).toFixed(2)})`,
    `0px 4px 5px 0px rgba(${color},${(opacity * 1.2).toFixed(2)}), 0px 10px 14px 0px rgba(${color},${(opacity * 1.8).toFixed(2)})`,
    `0px 5px 5px 0px rgba(${color},${(opacity * 1.4).toFixed(2)}), 0px 12px 16px 0px rgba(${color},${(opacity * 2).toFixed(2)})`,
    `0px 5px 6px 0px rgba(${color},${(opacity * 1.6).toFixed(2)}), 0px 14px 18px 0px rgba(${color},${(opacity * 2.2).toFixed(2)})`,
    `0px 6px 6px 0px rgba(${color},${(opacity * 1.8).toFixed(2)}), 0px 16px 20px 0px rgba(${color},${(opacity * 2.4).toFixed(2)})`,
    `0px 6px 7px 0px rgba(${color},${(opacity * 2).toFixed(2)}), 0px 18px 22px 0px rgba(${color},${(opacity * 2.6).toFixed(2)})`,
    `0px 7px 8px 0px rgba(${color},${(opacity * 2.2).toFixed(2)}), 0px 20px 24px 0px rgba(${color},${(opacity * 2.8).toFixed(2)})`,
    `0px 7px 8px 0px rgba(${color},${(opacity * 2.4).toFixed(2)}), 0px 22px 26px 0px rgba(${color},${(opacity * 3).toFixed(2)})`,
    `0px 7px 9px 0px rgba(${color},${(opacity * 2.6).toFixed(2)}), 0px 24px 28px 0px rgba(${color},${(opacity * 3.2).toFixed(2)})`,
    `0px 8px 9px 0px rgba(${color},${(opacity * 2.8).toFixed(2)}), 0px 26px 30px 0px rgba(${color},${(opacity * 3.4).toFixed(2)})`,
    `0px 8px 10px 0px rgba(${color},${(opacity * 3).toFixed(2)}), 0px 28px 32px 0px rgba(${color},${(opacity * 3.6).toFixed(2)})`,
    `0px 8px 11px 0px rgba(${color},${(opacity * 3.2).toFixed(2)}), 0px 30px 34px 0px rgba(${color},${(opacity * 3.8).toFixed(2)})`,
    `0px 9px 11px 0px rgba(${color},${(opacity * 3.4).toFixed(2)}), 0px 32px 36px 0px rgba(${color},${(opacity * 4).toFixed(2)})`,
    `0px 9px 12px 0px rgba(${color},${(opacity * 3.6).toFixed(2)}), 0px 34px 38px 0px rgba(${color},${(opacity * 4.2).toFixed(2)})`,
    `0px 9px 12px 0px rgba(${color},${(opacity * 3.8).toFixed(2)}), 0px 36px 40px 0px rgba(${color},${(opacity * 4.4).toFixed(2)})`,
    `0px 10px 13px 0px rgba(${color},${(opacity * 4).toFixed(2)}), 0px 38px 42px 0px rgba(${color},${(opacity * 4.6).toFixed(2)})`,
    `0px 10px 13px 0px rgba(${color},${(opacity * 4.2).toFixed(2)}), 0px 40px 44px 0px rgba(${color},${(opacity * 4.8).toFixed(2)})`,
    `0px 10px 14px 0px rgba(${color},${(opacity * 4.4).toFixed(2)}), 0px 42px 46px 0px rgba(${color},${(opacity * 5).toFixed(2)})`,
    `0px 11px 14px 0px rgba(${color},${(opacity * 4.6).toFixed(2)}), 0px 44px 48px 0px rgba(${color},${(opacity * 5.2).toFixed(2)})`,
    `0px 11px 15px 0px rgba(${color},${(opacity * 4.8).toFixed(2)}), 0px 46px 50px 0px rgba(${color},${(opacity * 5.4).toFixed(2)})`,
  ];
}