import re

with open('js/game.js', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('    drawShop(ctx, w, h) {')
end_idx = content.find('    // ─── Score Breakdown', start_idx)

if start_idx == -1 or end_idx == -1:
    print(f"Could not find boundaries. start={start_idx}, end={end_idx}")
    exit(1)

new_code = """
    // --- Helper for OS style borders ---
    drawOSRect(ctx, x, y, w, h, inset = false, bg = '#c0c0c0') {
        ctx.fillStyle = bg;
        ctx.fillRect(x, y, w, h);
        
        ctx.lineWidth = 2;
        // Top and Left
        ctx.strokeStyle = inset ? '#808080' : '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x, y + h); ctx.lineTo(x, y); ctx.lineTo(x + w, y);
        ctx.stroke();
        
        // Bottom and Right
        ctx.strokeStyle = inset ? '#ffffff' : '#404040';
        ctx.beginPath();
        ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
        ctx.stroke();
    }

    drawShop(ctx, w, h) {
        if (!this.shopScrollY) this.shopScrollY = 0;

        // Desktop background
        ctx.fillStyle = '#008080';
        ctx.fillRect(0, 0, w, h);
        
        const winX = w * 0.02;
        const winY = h * 0.02;
        const winW = w * 0.96;
        const winH = h * 0.96;
        
        // Main Window
        this.drawOSRect(ctx, winX, winY, winW, winH, false, '#c0c0c0');
        
        // Title bar
        const titleH = h * 0.08;
        ctx.fillStyle = '#0000aa';
        ctx.fillRect(winX + 4, winY + 4, winW - 8, titleH);
        
        drawText(ctx, 'Shop Merchant.exe', winX + 12, winY + 12, h * 0.045, '#ffffff');
        
        // Close Button
        const btnSize = titleH - 8;
        const btnX = winX + winW - 4 - btnSize - 4;
        const btnY = winY + 8;
        this.drawOSRect(ctx, btnX, btnY, btnSize, btnSize, false, '#c0c0c0');
        drawText(ctx, 'X', btnX + btnSize*0.25, btnY + btnSize*0.1, btnSize*0.7, '#000000');
        
        // Back Button (to match hit area ty < h*0.115, tx < w*0.2)
        const backBtnW = w * 0.15;
        const backBtnH = titleH - 8;
        const backBtnX = winX + 12 + textWidth(ctx, 'Shop Merchant.exe', h * 0.045) + 30;
        const backBtnY = winY + 8;
        this.drawOSRect(ctx, backBtnX, backBtnY, backBtnW, backBtnH, false, '#c0c0c0');
        drawText(ctx, '< BACK', backBtnX + backBtnW*0.1, backBtnY + backBtnH*0.15, backBtnH*0.6, '#000000');

        // Coin balance (Sunken text box)
        const coinBalText = `Coins: ${this.coins}  `;
        const coinSize = h * 0.04;
        const coinW = textWidth(ctx, coinBalText, coinSize);
        const coinBoxW = coinW + 40;
        const coinBoxH = h * 0.06;
        const coinBoxX = btnX - coinBoxW - 20;
        this.drawOSRect(ctx, coinBoxX, winY + 10, coinBoxW, coinBoxH, true, '#ffffff');
        drawText(ctx, coinBalText, coinBoxX + 10, winY + 16, coinSize, '#000000');
        
        // Coin icon
        ctx.beginPath();
        ctx.arc(coinBoxX + coinBoxW - 20, winY + 10 + coinBoxH/2, h * 0.015, 0, Math.PI * 2);
        ctx.fillStyle = rgba(255, 215, 0); ctx.fill();
        ctx.strokeStyle = rgba(0, 0, 0, 180); ctx.lineWidth = 1.5; ctx.stroke();

        // Content Area (Sunken)
        const contentX = winX + 10;
        const contentY = winY + titleH + 10;
        const contentW = winW - 20;
        const contentH = winH - titleH - 20;
        
        this.drawOSRect(ctx, contentX, contentY, contentW, contentH, true, '#ffffff');
        
        // --- Scroll Area ---
        ctx.save();
        ctx.beginPath();
        ctx.rect(contentX + 2, contentY + 2, contentW - 4, contentH - 4);
        ctx.clip();
        
        const scrollOffset = this.shopScrollY || 0;
        let drawY = contentY + 10 - scrollOffset;
        
        const secSize = h * 0.04;
        drawText(ctx, 'COMPANION:', contentX + 16, drawY, secSize, '#000080');
        drawY += secSize + 16;
        
        const cardW = w * 0.28;
        const cardH = h * 0.38;
        const cardGap = (contentW - this.companions.length * cardW) / (this.companions.length + 1);
        
        for (let i = 0; i < this.companions.length; i++) {
            const comp = this.companions[i];
            const cx = contentX + cardGap + i * (cardW + cardGap);
            const cy = drawY;
            const selected = this.shopSelectedIndex === i;
            
            this.drawOSRect(ctx, cx, cy, cardW, cardH, selected, selected ? '#e0e0e0' : '#c0c0c0');
            
            // Name
            const nSize = h * 0.028;
            const nW = textWidth(ctx, comp.name, nSize);
            drawText(ctx, comp.name, cx + (cardW - nW)/2, cy + 12, nSize, selected ? '#000080' : '#000000');
            
            // Diamond Icon
            const iSz = cardH * 0.2;
            ctx.save();
            ctx.translate(cx + cardW/2, cy + cardH * 0.38);
            ctx.beginPath();
            ctx.moveTo(0, -iSz); ctx.lineTo(iSz*0.7, 0); ctx.lineTo(0, iSz); ctx.lineTo(-iSz*0.7, 0);
            ctx.fillStyle = `rgb(${comp.color[0]}, ${comp.color[1]}, ${comp.color[2]})`;
            ctx.fill();
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
            ctx.restore();
            
            // Desc
            const dSize = h * 0.022;
            const dW = textWidth(ctx, comp.desc, dSize);
            drawText(ctx, comp.desc, cx + (cardW - dW)/2, cy + cardH * 0.62, dSize, '#404040');
            
            // Status/Price
            if (comp.owned) {
                const s = comp.equipped ? 'EQUIPPED' : 'OWNED';
                const sW = textWidth(ctx, s, dSize);
                drawText(ctx, s, cx + (cardW - sW)/2, cy + cardH * 0.78, dSize, comp.equipped ? '#008000' : '#000080');
            } else {
                const p = `$${comp.price}`;
                const pW = textWidth(ctx, p, dSize);
                drawText(ctx, p, cx + (cardW - pW)/2, cy + cardH * 0.78, dSize, '#800000');
            }
        }
        
        drawY += cardH + 30;
        
        drawText(ctx, 'ITEMS:', contentX + 16, drawY, secSize, '#000080');
        drawY += secSize + 16;
        
        const shopItems = [
            { id: 'revive', name: 'REVIVE', desc: '+1 Life', price: 25, icon: '\\u2665', color: [255, 80, 120], available: true },
            { id: 'speedster', name: 'SPEEDSTER', desc: '+Speed', price: 50, icon: '\\u00BB', color: [0, 255, 255], available: true },
            { id: 'soon1', name: 'COMING', desc: 'SOON', price: null, icon: '?', color: [100, 100, 130], available: false },
        ];
        
        for (let i = 0; i < shopItems.length; i++) {
            const item = shopItems[i];
            const ix = contentX + cardGap + i * (cardW + cardGap);
            const iy = drawY;
            
            this.drawOSRect(ctx, ix, iy, cardW, cardH, false, '#c0c0c0');
            
            // Name
            const nSize = h * 0.028;
            const nW = textWidth(ctx, item.name, nSize);
            drawText(ctx, item.name, ix + (cardW - nW)/2, iy + 12, nSize, item.available ? '#000000' : '#808080');
            
            // Icon
            const iSize = h * 0.07;
            const iW = textWidth(ctx, item.icon, iSize);
            drawText(ctx, item.icon, ix + (cardW - iW)/2, iy + cardH * 0.3, iSize, `rgb(${item.color.join(',')})`);
            
            // Desc
            const dSize = h * 0.022;
            const dW = textWidth(ctx, item.desc, dSize);
            drawText(ctx, item.desc, ix + (cardW - dW)/2, iy + cardH * 0.62, dSize, '#404040');
            
            // Price
            if (item.available && item.price != null) {
                const p = `$${item.price}`;
                const pW = textWidth(ctx, p, dSize);
                drawText(ctx, p, ix + (cardW - pW)/2, iy + cardH * 0.78, dSize, '#800000');
            }
        }
        
        drawY += cardH + 20;
        this.shopContentH = drawY + scrollOffset - contentY;
        
        ctx.restore(); // end clip
        
        // Scrollbar Track
        const sbW = 24;
        const sbX = contentX + contentW - sbW - 2;
        const sbY = contentY + 2;
        const sbH = contentH - 4;
        this.drawOSRect(ctx, sbX, sbY, sbW, sbH, true, '#dfdfdf');
        
        // Scroll thumb
        if (this.shopContentH > contentH) {
            const thumbH = Math.max(30, (contentH / this.shopContentH) * sbH);
            const thumbY = sbY + (scrollOffset / (this.shopContentH - contentH)) * (sbH - thumbH);
            this.drawOSRect(ctx, sbX + 2, thumbY, sbW - 4, thumbH, false, '#c0c0c0');
        }
        
        // Cello Helper (ASCII style)
        if (this.shopCelloVisible) {
            this.drawCelloAssistant(ctx, w, h);
        }
        
        // Confirm Buy Overlay
        if (this.shopConfirmType) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0,0,w,h);
            
            const cw = w * 0.5;
            const ch = h * 0.4;
            const cx = (w - cw)/2;
            const cy = (h - ch)/2;
            
            this.drawOSRect(ctx, cx, cy, cw, ch, false, '#c0c0c0');
            ctx.fillStyle = '#000080';
            ctx.fillRect(cx + 4, cy + 4, cw - 8, titleH);
            drawText(ctx, 'Confirm.exe', cx + 12, cy + 12, h * 0.045, '#ffffff');
            
            const q = 'Do you want to purchase this?';
            const qS = h * 0.035;
            const qW = textWidth(ctx, q, qS);
            drawText(ctx, q, cx + (cw - qW)/2, cy + ch*0.4, qS, '#000000');
            
            // Buttons
            const cBtnW = cw * 0.3;
            const cBtnH = h * 0.08;
            // CANCEL (Left)
            this.drawOSRect(ctx, cx + cw*0.15, cy + ch*0.65, cBtnW, cBtnH, false, '#c0c0c0');
            drawText(ctx, 'CANCEL', cx + cw*0.15 + cBtnW*0.15, cy + ch*0.65 + cBtnH*0.2, h*0.035, '#000000');
            // BUY (Right)
            this.drawOSRect(ctx, cx + cw*0.55, cy + ch*0.65, cBtnW, cBtnH, false, '#c0c0c0');
            drawText(ctx, 'BUY', cx + cw*0.55 + cBtnW*0.3, cy + ch*0.65 + cBtnH*0.2, h*0.035, '#000000');
        }
    }

    drawCelloAssistant(ctx, w, h) {
        const isHelp = this.shopAssistantStep >= 4;
        const dialogs = [
            'Hi there! I am Cello, your shop assistant!\\nWelcome to the Companion Shop!',
            'Here you can buy Companions that will\\nhelp you destroy blocks with projectiles!',
            'Each companion fires differently:\\nLinear - Zigzag - Side shots!',
            'Collect coins from breaking blocks\\nto buy them. Let us go shopping!',
            'Any help?'
        ];
        const step = Math.min(this.shopAssistantStep, dialogs.length - 1);
        const msg = dialogs[step];

        const cw = w * 0.45;
        const ch = h * 0.35;
        const cx = w * 0.5;
        const cy = h * 0.6;
        
        this.drawOSRect(ctx, cx, cy, cw, ch, false, '#c0c0c0');
        const titleH = h * 0.06;
        ctx.fillStyle = '#000080';
        ctx.fillRect(cx + 4, cy + 4, cw - 8, titleH);
        drawText(ctx, 'Webby_Helper.txt', cx + 10, cy + 8, h * 0.035, '#ffffff');
        
        ctx.fillStyle = '#ffffff';
        const textH = ch - titleH - 12;
        ctx.fillRect(cx + 6, cy + titleH + 6, cw - 12, textH);
        this.drawOSRect(ctx, cx + 6, cy + titleH + 6, cw - 12, textH, true, 'transparent');
        
        // ASCII Dolphin
        const ascii = [
            "    ,     ,",
            "   / \\---/ \\",
            "  (  o   o  )",
            "   \\  ___  /",
            "    `-----` "
        ];
        
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${h * 0.022}px monospace`;
        let ay = cy + titleH + 30;
        for (const line of ascii) {
            ctx.fillText(line, cx + 20, ay);
            ay += h * 0.025;
        }
        
        ctx.font = `bold ${h * 0.022}px sans-serif`;
        // Draw dialog
        const lines = msg.split('\\n');
        let ty = cy + titleH + 40;
        for(let li = 0; li < lines.length; li++) {
            ctx.fillText(lines[li], cx + 150, ty);
            ty += h * 0.03;
        }
        
        if (!isHelp) {
            const contText = '[ Tap to continue ]';
            ctx.fillText(contText, cx + 150, ty + h * 0.05);
        }
    }
"""

with open('js/game.js', 'w', encoding='utf-8') as f:
    f.write(content[:start_idx] + new_code + "\n" + content[end_idx:])

print("Successfully replaced drawShop and drawCelloAssistant!")
