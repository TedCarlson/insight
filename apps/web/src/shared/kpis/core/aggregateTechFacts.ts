export function aggregateTechFacts(rows: any[]) {
  let tnps_surveys = 0;
  let tnps_promoters = 0;
  let tnps_detractors = 0;

  let ftr_total = 0;
  let ftr_fail = 0;

  let tu_total = 0;
  let tu_good = 0;

  let jobs = 0;

  for (const r of rows) {
    tnps_surveys += r.tnps_surveys ?? 0;
    tnps_promoters += r.tnps_promoters ?? 0;
    tnps_detractors += r.tnps_detractors ?? 0;

    ftr_total += r.total_ftr_contact_jobs ?? 0;
    ftr_fail += r.ftr_fail_jobs ?? 0;

    tu_total += r.tu_eligible_jobs ?? 0;
    tu_good += r.tu_compliant_jobs ?? 0;

    jobs += r.total_jobs ?? 0;
  }

  return {
    tnps:
      tnps_surveys > 0
        ? ((tnps_promoters - tnps_detractors) / tnps_surveys) * 100
        : null,

    ftr:
      ftr_total > 0
        ? ((ftr_total - ftr_fail) / ftr_total) * 100
        : null,

    tool:
      tu_total > 0 ? (tu_good / tu_total) * 100 : null,

    jobs,
  };
}