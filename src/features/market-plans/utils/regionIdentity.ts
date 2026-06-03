export const REGION_IDENTITY = {
  DIY: {
    label: 'DIY',
    color: 'text-sky-500',
    dot: 'bg-sky-500',
    regions: ['sleman', 'bantul', 'kulon progo', 'kota yogyakarta', 'diy']
  },
  MGL: {
    label: 'MGL',
    color: 'text-fuchsia-500',
    dot: 'bg-fuchsia-500',
    regions: ['magelang']
  },
  PWJ: {
    label: 'PWJ',
    color: 'text-violet-500',
    dot: 'bg-violet-500',
    regions: ['purworejo']
  },
  GKD: {
    label: 'GKD',
    color: 'text-rose-500',
    dot: 'bg-rose-500',
    regions: ['gunungkidul']
  }
};

export function getRegionIdentity(wilayah: string) {
  const normalized = wilayah?.trim().toLowerCase();
  console.log("RegionIdentity debug:", { wilayah, normalized });
  for (const [key, value] of Object.entries(REGION_IDENTITY)) {
    if (value.regions.some(r => normalized.includes(r))) {
      return { ...value, key };
    }
  }
  return null;
}
