import React from "react";
import { QRCodeCanvas } from "qrcode.react";

const TicketPrint = ({ ticket }) => {
  const qrData = JSON.stringify({
    ticketNo: ticket.ticketNo,
    name: ticket.name,
    playerNames: ticket.playerNames,
    type: ticket.ticketType,
    fee: ticket.fee,
    date: ticket.date.nepaliDate,
    time: ticket.time,
    branch: ticket.branch?.branchName,
    staff: ticket.staff?.name,
  });
  const peopleCount = ticket.numberOfPeople || ticket.playerStatus?.totalPlayers || 1;
  const discountAmount = ticket.discount || 0;
  const finalFee = ticket.fee || 0;
  // Calculate original total: if discount exists, add it back to final fee
  // Otherwise, calculate from perPersonFee if available
  const originalTotal = discountAmount > 0 
    ? (finalFee + discountAmount)
    : (ticket.perPersonFee ? (ticket.perPersonFee * peopleCount) : finalFee);
  const perPersonAmount = peopleCount > 0 ? finalFee / peopleCount : finalFee;

  return (
    <div className="ticket-print">
      <style>
        {`
          @media print {
  @page {
    size: 80mm auto;
    margin: 0;
  }
  body {
    width: 80mm !important;
    margin: 0;
    padding: 0;
    font-family: 'Courier New', monospace;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .ticket-print {
    width: 76mm !important;
    margin: 0 auto;
    padding: 3mm 2mm;
    box-sizing: border-box;
    font-size: 10px;
    line-height: 1.3;
    color: #000;
  }
  body > *:not(.ticket-print) {
    display: none !important;
  }
}


          /* Screen Preview */
          .ticket-print {
            width: 80mm;
            margin: 10px auto;
            background: #fff;
            border: 1px dashed #ccc;
            padding: 4mm 3mm;
            font-family: 'Courier New', monospace;
            font-size: 10px;
            line-height: 1.3;
            color: #000;
          }
        `}
      </style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "5px" }}>
        <div style={{ fontSize: "13px", fontWeight: "bold" }}>
          बेलका स्केट पार्क एण्ड गेमिङ जोन
        </div>
        <div style={{ fontSize: "9px" }}>
          बेलका न.पा.–९, रामपुर (कुमारी बैंक छेउ)
        </div>
        <div style={{ fontSize: "8px", marginTop: "2px" }}>
          सम्पर्क: {ticket.branch?.contactNumber || "9812345678"}
        </div>
        <div
          style={{
            borderTop: "1px dashed #000",
            margin: "4px 0",
          }}
        />
      </div>

      {/* Ticket Details */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Ticket No:</span>
          <strong>{ticket.ticketNo}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Date (BS):</span>
          <span>{ticket.date.nepaliDate}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Date (AD):</span>
          <span>
            {new Date(ticket.date.englishDate).toLocaleDateString("en-GB")}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Time:</span>
          <span>
            {(() => {
              if (!ticket.time) return '';
              const dateObj = ticket.date?.englishDate ? new Date(ticket.date.englishDate) : null;
              if (!dateObj) return ticket.time;
              const [hh, mm, ss] = ticket.time.split(':');
              const start = new Date(dateObj);
              start.setHours(+hh, +mm, +((ss || 0)), 0);
              const extraMinutes = ticket.totalExtraMinutes || 0;
              const isRefunded = ticket.isRefunded || false;
              const minsToAdd = isRefunded ? extraMinutes : 60 + extraMinutes;
              const end = new Date(start.getTime() + minsToAdd * 60000);
              const endTimeStr = end.toTimeString().substring(0, 5);
              // Sanitize any stray characters (e.g. accidental '$') before showing
              const cleanStart = String(ticket.time || '').replace(/[^0-9:\s]/g, '').trim();
              const cleanEnd = String(endTimeStr || '').replace(/[^0-9:\s]/g, '').trim();
              return `${cleanStart} - ${cleanEnd}`;
            })()}
          </span>
        </div>
        <div
          style={{
            borderTop: "1px dashed #000",
            margin: "4px 0",
          }}
        />
      </div>

      {/* Customer Info */}
      <div>
        <div>
          Customer: <strong>{ticket.name}</strong>
        </div>
        {ticket.playerNames && ticket.playerNames.length > 0 && (
          <div style={{ fontSize: "9px" }}>
            Players: {ticket.playerNames.join(", ")}
          </div>
        )}
        <div style={{ fontSize: "9px" }}>
          People: {peopleCount}
        </div>
        {ticket.groupInfo?.groupName && (
          <div style={{ fontSize: "9px" }}>
            Group: {ticket.groupInfo.groupName}
            {ticket.groupInfo.groupNumber ? ` (${ticket.groupInfo.groupNumber})` : ""}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Type:</span>
          <span>{ticket.ticketType}</span>
        </div>
        <div
          style={{
            borderTop: "1px dashed #000",
            margin: "4px 0",
          }}
        />
      </div>

      {/* Fee Section */}
      {discountAmount > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "10px",
            marginBottom: "2px",
          }}
        >
          <span>Subtotal:</span>
          <span>रु {originalTotal.toLocaleString()}</span>
        </div>
      )}
      {discountAmount > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "10px",
            marginBottom: "2px",
            color: "#d32f2f",
          }}
        >
          <span>Discount:</span>
          <span>- रु {discountAmount.toLocaleString()}</span>
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "12px",
          fontWeight: "bold",
          marginBottom: "4px",
          borderTop: discountAmount > 0 ? "1px dashed #000" : "none",
          paddingTop: discountAmount > 0 ? "2px" : "0",
        }}
      >
        <span>Total Fee:</span>
        <span>रु {finalFee.toLocaleString()}</span>
      </div>
      {ticket.refundAmount > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "#bc1b1b",
            marginBottom: "2px",
            fontWeight: 700,
          }}
        >
          <span>Refunded:</span>
          <span>- रु {ticket.refundAmount.toLocaleString()}</span>
        </div>
      )}
      {ticket.refundAmount > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            fontWeight: "bold",
            marginBottom: "4px",
            borderTop: "1px dashed #000",
            paddingTop: "2px",
          }}
        >
          <span>Net Paid:</span>
          <span>रु {(finalFee - ticket.refundAmount).toLocaleString()}</span>
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "10px",
          marginBottom: "4px",
        }}
      >
        <span>Per Person:</span>
        <span>रु {perPersonAmount.toFixed(2)}</span>
      </div>

      {ticket.remarks && (
        <div style={{ fontSize: "9px", fontStyle: "italic" }}>
          Note: {ticket.remarks}
        </div>
      )}

      <div
        style={{
          borderTop: "1px dashed #000",
          margin: "4px 0",
        }}
      />

      {/* QR Section */}
      <div style={{ textAlign: "center", marginTop: "4px" }}>
        <QRCodeCanvas value={qrData} size={70} />
        <div style={{ fontSize: "8px", marginTop: "2px" }}>
          Scan to Verify Ticket
        </div>
      </div>

      {/* Rules */}
      <div
        style={{
          textAlign: "center",
          fontSize: "8px",
          marginTop: "4px",
          paddingTop: "3px",
          borderTop: "1px dashed #000",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "2px" }}>
          नियम तथा शर्तहरू
        </div>
        <div>
          • एकपटक मात्र मान्य • हराएमा पुनः प्राप्त हुँदैन <br />
          • नियम उल्लङ्घन रद्द • सुरक्षा पालना गर्नुहोस्
        </div>
      </div>

      {/* Signature */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "8px",
        }}
      >
        <div style={{ textAlign: "center", width: "45%" }}>
          <div
            style={{
              borderTop: "1px solid #000",
              marginTop: "8px",
              fontSize: "8px",
            }}
          >
            बुकिङ गर्ने
          </div>
        </div>
        <div style={{ textAlign: "center", width: "45%" }}>
          <div
            style={{
              borderTop: "1px solid #000",
              marginTop: "8px",
              fontSize: "8px",
            }}
          >
            बुकिङ लिने
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          fontSize: "8px",
          borderTop: "1px dashed #000",
          marginTop: "4px",
          paddingTop: "3px",
        }}
      >
        धन्यवाद! फेरि आउनुहोस् 🙏
      </div>
    </div>
  );
};

export default TicketPrint;
