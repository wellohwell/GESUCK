import { SimulationConfig, SimulationResult } from '../../types/pricelist';

export function simulateInstallment(
  hargaOtr: number,
  marginRate: number,
  config: SimulationConfig
): SimulationResult {
  const totalDp = config.dpPribadi + config.subsidi;
  const pokokHutang = Math.max(0, hargaOtr - totalDp);
  
  // LOGIC BISNIS CUSTOM:
  // Margin diterapkan terhadap pokok hutang x marginRate
  const totalMargin = pokokHutang * marginRate;
  const totalHutang = pokokHutang + totalMargin;
  
  const angsuranPerBulan = config.tenor > 0 ? Math.ceil(totalHutang / config.tenor) : 0;
  
  // Sesuai requirement: Omset = Angsuran x Tenor
  const totalOmset = angsuranPerBulan * config.tenor;

  return {
    pokokHutang,
    totalMargin,
    totalHutang,
    angsuranPerBulan,
    totalOmset
  };
}

export const formatRp = (amount: number) => {
  return new Intl.NumberFormat("id-ID", { 
    style: "currency", 
    currency: "IDR", 
    minimumFractionDigits: 0 
  }).format(amount);
}
