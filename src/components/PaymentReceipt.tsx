import React, { useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';

interface PaymentReceiptProps {
  date: string;
  amount: number;
  receivedFrom: string;
  paymentMode: string;
  placeOfSupply: string;
  customerAddress: string; // Customer address from database
}

export async function generatePaymentReceiptPDF({ date, amount, receivedFrom, paymentMode, placeOfSupply, customerAddress }: PaymentReceiptProps) {
  // Helper function to convert number to words
  const convertToWords = (num: number): string => {
    const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const double = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const formatTens = (num: number): string => {
      if (num < 10) return single[num];
      if (num < 20) return double[num - 10];
      return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + single[num % 10] : '');
    };
    
    if (num === 0) return 'Zero';
    
    // Handle rupees conversion
    let words = '';
    
    // Handle crores
    if (num >= 10000000) {
      words += convertToWords(Math.floor(num / 10000000)) + ' Crore ';
      num %= 10000000;
    }
    
    // Handle lakhs
    if (num >= 100000) {
      words += convertToWords(Math.floor(num / 100000)) + ' Lakh ';
      num %= 100000;
    }
    
    // Handle thousands
    if (num >= 1000) {
      words += convertToWords(Math.floor(num / 1000)) + ' Thousand ';
      num %= 1000;
    }
    
    // Handle hundreds
    if (num >= 100) {
      words += convertToWords(Math.floor(num / 100)) + ' Hundred ';
      num %= 100;
    }
    
    // Handle tens and units
    if (num > 0) {
      words += formatTens(num);
    }
    
    return words.trim();
  };

  try {
    // Load images first
    const [logoImg, signatureImg] = await Promise.all([
      loadImage('/images/axiso-logo.png'),
      loadImage('/images/axiso-signature.png')
    ]);

    // Create a new PDF document with A4 size
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    
    // Set page dimensions
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    
    // Set white background for the whole page
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 297, 'F');
    
    // Company details on the left
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Axiso Green Energies Private Limited', margin, 25);
    
    // Company details in lighter text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text('Telangana', margin, 32);
    doc.text('India', margin, 39);
    doc.text('GSTIN 36ABCA4478M1Z9', margin, 46);
    doc.text('admin@axisogreen.in', margin, 53);
    doc.text('www.axisogreen.in', margin, 60);
    
    // Add logo at right side
    if (logoImg) {
      doc.addImage(logoImg, 'PNG', pageWidth - margin - 45, 25, 45, 30);
    }
    
    // Add horizontal line
    doc.setLineWidth(0.5);
    doc.line(margin, 70, pageWidth - margin, 70);

    // Payment Receipt title - centered and underlined
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(21);
    const titleText = 'PAYMENT RECEIPT';
    doc.text(titleText, pageWidth / 2, 85, { align: 'center' });
    
    // Add underline for the title - fixed to ensure visibility
    const titleWidth = doc.getTextWidth(titleText);
    doc.setDrawColor(0, 0, 0); // Ensure black color for the line
    doc.setLineWidth(1); // Make line thicker for better visibility
    doc.line(
      pageWidth / 2 - titleWidth / 2,
      88, // Positioned slightly lower for better spacing
      pageWidth / 2 + titleWidth / 2,
      88
    );
    
    // Background color for data cells - #97afc2 with 29% opacity
    const r = 151, g = 175, b = 194; // #97afc2 in RGB
    const blendWithWhite = (color: number, opacity: number) => {
      return Math.round(color * opacity + 255 * (1 - opacity));
    };
    
    // Calculate colors with 29% opacity
    const bgColorR = blendWithWhite(r, 0.29);
    const bgColorG = blendWithWhite(g, 0.29);
    const bgColorB = blendWithWhite(b, 0.29);
    
    // Set up table dimensions to match the example image
    const startY = 100;
    const rowHeight = 15;
    
    // Set up cell dimensions
    const labelColWidth = 80;
    const dataColWidth = 120;
    
    // Layout coordinates
    const labelX = margin;
    const dataX = margin + labelColWidth;
    
    // Green box dimensions - adjusted to match example image
    const greenBoxWidth = 55;
    const greenBoxHeight = rowHeight * 2.5; // Reduced height slightly
    const greenBoxX = dataX + dataColWidth - greenBoxWidth;
    
    // Reference ID
    const refNumber = 'ZBYKUQLSS';
    
    // Draw labels - left aligned
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(15);
    doc.setTextColor(0, 0, 0);
    
    doc.text('Payment Date', labelX, startY + 7);
    doc.text('Reference Number', labelX, startY + rowHeight + 7);
    doc.text('Payment Mode', labelX, startY + rowHeight * 2 + 7);
    doc.text('Place Of Supply', labelX, startY + rowHeight * 3 + 7);
    doc.text('Amount Received In', labelX, startY + rowHeight * 4 + 7);
    doc.text('Words', labelX, startY + rowHeight * 5 + 7);
    
    // Function to draw data cells with background
    const drawDataCell = (
      x: number,
      y: number,
      width: number, 
      height: number, 
      text: string, 
      fontSize: number = 15
    ): void => {
      // Background for data
      doc.setFillColor(bgColorR, bgColorG, bgColorB);
      doc.rect(x, y, width, height, 'F');
      
      // Text for data
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize);
      
      // Position text in cell
      const textY = y + (height / 2) + (fontSize / 6);
      doc.text(text, x + 5, textY);
    };
    
    // Draw the green box first - smaller
    doc.setFillColor(140, 198, 63); // Green color
    doc.rect(greenBoxX, startY, greenBoxWidth, greenBoxHeight, 'F');
    
    // Amount Received label on a single line inside green box
    doc.setTextColor(255, 255, 255); // White text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text('Amount Received', greenBoxX + 5, startY + 10);
    
    // Amount value inside green box - moved higher up
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    const amountText = `Rs.${amount.toLocaleString()}`;
    doc.text(amountText, greenBoxX + 5, startY + 22); // Moved up from 30 to 22
    
    // Format date to only show YYYY-MM-DD
    let formattedDate = date;
    if (typeof date === 'string') {
      // Handle ISO date strings and others
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        // Format as YYYY-MM-DD
        formattedDate = d.toISOString().split('T')[0];
      } else {
        // Fallback: try to extract date part if possible
        formattedDate = date.split('T')[0];
      }
    }

    // Draw data cells for payment details - adjusted to not overlap with green box
    const adjustedDataWidth = dataColWidth - greenBoxWidth;
    drawDataCell(dataX, startY, adjustedDataWidth, rowHeight, formattedDate);
    drawDataCell(dataX, startY + rowHeight, adjustedDataWidth, rowHeight, refNumber);
    
    // Fill all other data fields with the background color
    drawDataCell(dataX, startY + rowHeight * 2, dataColWidth, rowHeight, paymentMode);
    // Show (36) for Telangana, (37) for AP, nothing for others
    let placeOfSupplyWithCode = placeOfSupply;
    if (placeOfSupply === 'Telangana') {
      placeOfSupplyWithCode = 'Telangana (36)';
    } else if (placeOfSupply === 'AP' || placeOfSupply === 'Andhra Pradesh') {
      placeOfSupplyWithCode = 'AP (37)';
    }
    drawDataCell(dataX, startY + rowHeight * 3, dataColWidth, rowHeight, placeOfSupplyWithCode);
    
    // Amount in words - spanning two rows
    const amountInWords = `Indian Rupee ${convertToWords(amount)} Only`;
    drawDataCell(dataX, startY + rowHeight * 4, dataColWidth, rowHeight * 2, amountInWords);
    
    // Received from section
    const receivedFromY = startY + rowHeight * 7;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(15);
    doc.text('Received From', labelX, receivedFromY);
    
    // Format address to multiple lines if needed
    const formatAddressToLines = (address: string, maxLength: number = 40): string[] => {
      if (!address) return [];
      
      const words = address.split(' ');
      const lines: string[] = [];
      let currentLine = words[0];
      
      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        if ((currentLine + ' ' + word).length <= maxLength) {
          currentLine += ' ' + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      
      if (currentLine) lines.push(currentLine);
      return lines;
    };
    
    // Customer information section - limiting colored area to just name and address
    const fullWidth = dataColWidth + labelColWidth;
    
    // Customer name with blue background
    drawDataCell(labelX, receivedFromY + 5, fullWidth, rowHeight, receivedFrom);
    
    // Customer address with same blue background, possibly multiple rows
    if (customerAddress) {
      const addressLines = formatAddressToLines(customerAddress);
      const addressFontSize = 11;
      
      // Create a background for all address lines
      doc.setFillColor(bgColorR, bgColorG, bgColorB);
      // Reduce line height for address to 10mm (was 15mm)
      const addressLineHeight = 10;
      const addressHeight = addressLineHeight * addressLines.length;
      doc.rect(labelX, receivedFromY + 5 + rowHeight, fullWidth, addressHeight, 'F');
      
      // Draw each line of the address
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(addressFontSize);
      doc.setTextColor(0, 0, 0);
      
      addressLines.forEach((line, index) => {
        // Adjust positioning with reduced spacing
        const y = receivedFromY + 5 + rowHeight + (addressLineHeight / 2) + (index * addressLineHeight) + (addressFontSize / 6);
        doc.text(line, labelX + 5, y);
      });
    }
    
    // Add signature at appropriate position with clear space between address area
    if (signatureImg) {
      const addressLines = customerAddress ? formatAddressToLines(customerAddress) : [];
      // Adjust signature position based on reduced address line height
      const addressLineHeight = 10;
      const signatureY = receivedFromY + 5 + rowHeight + (addressLines.length * addressLineHeight) + 20;
      doc.addImage(signatureImg, 'PNG', greenBoxX, signatureY, 50, 20);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Authorized Signature', greenBoxX, signatureY + 35);
    }
    
    // Save the PDF with a filename based on customer and date
    doc.save(`${receivedFrom}-receipt-${date}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}

const PaymentReceipt: React.FC<PaymentReceiptProps> = () => null;

// Helper function to load image
const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = () => {
      console.warn(`Failed to load image: ${url}`);
      resolve(''); // Return empty string if image fails to load
    };
    img.src = url;
  });
};

export default PaymentReceipt; 