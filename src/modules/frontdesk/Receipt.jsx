import './Receipt.css';

export default function Receipt({ reservation, onClose }) {
  const totalCharges = reservation.charges?.reduce((sum, c) => sum + Number(c.amount), 0) ?? 0;
  const totalPaid = reservation.payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const balance = totalCharges - totalPaid;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="receipt-overlay">
      <div className="receipt-toolbar no-print">
        <button className="modal-btn-secondary" onClick={onClose}>Close</button>
        <button className="modal-btn-primary" onClick={handlePrint}>Print Receipt</button>
      </div>

      <div className="receipt-paper" id="receipt-print-area">
        <div className="receipt-header">
          <h2>Golden Apple</h2>
          <p>Guest House</p>
          <p className="receipt-divider">— — — — — — — — — — — —</p>
        </div>

        <div className="receipt-row"><span>Guest</span><span>{reservation.guest?.full_name}</span></div>
        <div className="receipt-row"><span>Room</span><span>{reservation.room?.room_number}</span></div>
        <div className="receipt-row"><span>Check-in</span><span>{reservation.check_in_date}</span></div>
        <div className="receipt-row"><span>Check-out</span><span>{reservation.check_out_date}</span></div>

        <p className="receipt-divider">— — — — — — — — — — — —</p>
        <p className="receipt-section-title">Charges</p>
        {reservation.charges?.map((c) => (
          <div className="receipt-row" key={c.id}>
            <span>{c.charge_type.replace('_', ' ')}{c.description ? ` (${c.description})` : ''}</span>
            <span>GH₵{Number(c.amount).toFixed(2)}</span>
          </div>
        ))}

        <p className="receipt-divider">— — — — — — — — — — — —</p>
        <p className="receipt-section-title">Payments</p>
        {reservation.payments?.map((p) => (
          <div className="receipt-row" key={p.id}>
            <span>{p.method.replace('_', ' ')}</span>
            <span>GH₵{Number(p.amount).toFixed(2)}</span>
          </div>
        ))}

        <p className="receipt-divider">— — — — — — — — — — — —</p>
        <div className="receipt-row receipt-total"><span>Total Charges</span><span>GH₵{totalCharges.toFixed(2)}</span></div>
        <div className="receipt-row receipt-total"><span>Total Paid</span><span>GH₵{totalPaid.toFixed(2)}</span></div>
        <div className="receipt-row receipt-total"><span>Balance</span><span>GH₵{balance.toFixed(2)}</span></div>

        <p className="receipt-footer">Thank you for staying with us!</p>
        <p className="receipt-footer receipt-footer-small">{new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}