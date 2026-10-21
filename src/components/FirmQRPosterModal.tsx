import React, { useState, useEffect } from 'react';
import { X, Printer, Download, QrCode, Wheat, Building2, Copy, CheckCircle2, ShieldCheck, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';
import type { Firm } from '../types';

interface FirmQRPosterModalProps {
  firm: Firm;
  onClose: () => void;
  onOpenSelfRegisterPreview: (firmId: string) => void;
}

export const FirmQRPosterModal: React.FC<FirmQRPosterModalProps> = ({
  firm,
  onClose,
  onOpenSelfRegisterPreview,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const registrationUrl = `${window.location.origin}/?firmRegister=${encodeURIComponent(firm.id)}`;

  useEffect(() => {
    const generateQR = async () => {
      try {
        const url = await QRCode.toDataURL(registrationUrl, {
          width: 360,
          margin: 2,
          color: {
            dark: '#064e3b',
            light: '#ffffff',
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('Failed to generate firm QR code:', err);
      }
    };

    generateQR();
  }, [firm.id, registrationUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
        {/* Controls - Hidden in Print */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 no-print">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-800" />
            <h3 className="text-sm font-bold text-slate-900">Firm Public QR Code Poster</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg inline-flex items-center gap-1 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Poster</span>
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Counter Poster Card */}
        <div className="print-card p-6 bg-gradient-to-b from-emerald-50/70 to-white border-2 border-emerald-800 rounded-2xl mt-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-emerald-900 font-extrabold text-sm uppercase tracking-wider">
            <Wheat className="w-5 h-5 text-amber-600" />
            <span>KisanSetu Mandi Digital Payment</span>
            <Wheat className="w-5 h-5 text-amber-600" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
              {firm.firmName}
            </h2>
            <p className="text-xs text-slate-600">
              {firm.address} · मंडी व्यापारी: <strong>{firm.ownerName}</strong>
            </p>
            <div className="text-[11px] font-mono text-emerald-800 font-bold">
              लाइसेंस नं: {firm.mandiLicenseNumber || 'APMC Registered'} · फोन: {firm.mobile}
            </div>
          </div>

          <div className="py-2">
            <div className="bg-amber-100 text-amber-950 text-xs font-bold py-1 px-3 rounded-full inline-block border border-amber-300">
              🌾 किसान भाई सीधे अपने मोबाइल से पासबुक फोटो अपलोड करें
            </div>
          </div>

          {/* Big Sharp QR Code */}
          <div className="bg-white p-4 rounded-2xl border-2 border-emerald-700 shadow-sm inline-block">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Firm QR" className="w-56 h-56 mx-auto" />
            ) : (
              <div className="w-56 h-56 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                Generating QR...
              </div>
            )}
            <div className="mt-2 text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider">
              Scan to Register &amp; Submit Passbook
            </div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-xl text-left text-xs text-slate-700 space-y-1">
            <div className="font-bold text-emerald-900 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>सीधा दुकान से जुड़ाव (Firm Security Lock):</span>
            </div>
            <p className="text-[11px] text-slate-600">
              इस QR कोड को स्कैन करने पर किसान का विवरण सीधे केवल <strong>{firm.firmName}</strong> में ही जमा होगा। किसी अन्य दुकान में नहीं जाएगा।
            </p>
          </div>

          <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-200">
            दुकान के तौल कांटे / काउंटर / पर्ची पर चिपकाने हेतु पोस्टर · KisanSetu RTGS Engine
          </div>
        </div>

        {/* Action Tools - Hidden in Print */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1.5 transition"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied!' : 'Copy Direct Link'}</span>
            </button>

            <a
              href={qrDataUrl}
              download={`Firm_QR_${firm.firmName.replace(/\s+/g, '_')}.png`}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Image</span>
            </a>
          </div>

          <button
            onClick={() => onOpenSelfRegisterPreview(firm.id)}
            className="px-3.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg inline-flex items-center gap-1.5 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Test Farmer Page</span>
          </button>
        </div>
      </div>
    </div>
  );
};
