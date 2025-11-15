import QRCode from 'qrcode';

export const generateQRCode = async (data) => {
  try {
    const qrCodeData = JSON.stringify(data);
    const qrCodeImage = await QRCode.toDataURL(qrCodeData);
    return qrCodeImage;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
};

export const generateTicketQRData = (ticket) => {
  return {
    ticketNo: ticket.ticketNo,
    name: ticket.name,
    ticketType: ticket.ticketType,
    fee: ticket.fee,
    date: ticket.date.nepaliDate,
    time: ticket.time,
    branch: ticket.branch.branchName,
    staff: ticket.staff.name
  };
};