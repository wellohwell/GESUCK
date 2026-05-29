import React from "react";
import { useNavigate } from "react-router-dom";
import Report from "../../../../pages/Report";

export default function MarketPlansReportPage() {
  const navigate = useNavigate();
  return <Report onBack={() => navigate("/workspace/market-plans")} />;
}
