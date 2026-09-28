import re

with open('js/game.js', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('    handleShopTap(vx, vy) {')
end_idx = content.find('    calculateScoreBreakdown() {', start_idx)

if start_idx == -1 or end_idx == -1:
    print(f"Could not find boundaries. start={start_idx}, end={end_idx}")
    exit(1)

new_code = r"""    handleShopTap(vx, vy) {
        const w = this.w;
        const h = this.h;
        if (this.shopConfirmType) {
            // Confirm Buy Overlay active
            const cw = w * 0.5;
            const ch = h * 0.4;
            const cx = (w - cw)/2;
            const cy = (h - ch)/2;
            const cBtnW = cw * 0.3;
            const cBtnH = h * 0.08;
            
            // Cancel button
            if (vx >= cx + cw*0.15 && vx <= cx + cw*0.15 + cBtnW && vy >= cy + ch*0.65 && vy <= cy + ch*0.65 + cBtnH) {
                this.shopConfirmType = null;
                this.audio.init(); this.audio.playHitWallSound();
                return;
            }
            // Buy button
            if (vx >= cx + cw*0.55 && vx <= cx + cw*0.55 + cBtnW && vy >= cy + ch*0.65 && vy <= cy + ch*0.65 + cBtnH) {
                this.audio.init(); this.audio.playBrickSound(1.2);
                if (this.shopConfirmType === 'companion') {
                    const comp = this.companions[this.shopConfirmIndex];
                    this.coins -= comp.price;
                    comp.owned = true;
                    this.saveProgress();
                } else if (this.shopConfirmType === 'item') {
                    if (this.shopConfirmIndex === 0) {
                        this.coins -= 25;
                        this.extraLives = (this.extraLives || 0) + 1;
                        this.saveProgress();
                    } else if (this.shopConfirmIndex === 1) {
                        this.coins -= 50;
                        this.speedsterActive = true;
                        this.saveProgress();
                    }
                }
                this.shopConfirmType = null;
                return;
            }
            return; // Block other clicks
        }

        const winX = w * 0.02;
        const winY = h * 0.02;
        const winW = w * 0.96;
        const winH = h * 0.96;
        const titleH = h * 0.08;
        
        // Check Close button (X)
        const btnSize = titleH - 8;
        const btnX = winX + winW - 4 - btnSize - 4;
        const btnY = winY + 8;
        if (vx >= btnX && vx <= btnX + btnSize && vy >= btnY && vy <= btnY + btnSize) {
            this.isExitingShop = true;
            this.audio.init(); this.audio.playHitWallSound();
            return;
        }

        const contentX = winX + 10;
        const contentY = winY + titleH + 10;
        const contentW = winW - 20;
        const scrollOffset = this.shopScrollY || 0;
        let drawY = contentY + 10 - scrollOffset;
        
        const secSize = h * 0.04;
        drawY += secSize + 16;
        
        const cardW = w * 0.28;
        const cardH = h * 0.38;
        const cardGap = (contentW - this.companions.length * cardW) / (this.companions.length + 1);
        
        for (let i = 0; i < this.companions.length; i++) {
            const cx = contentX + cardGap + i * (cardW + cardGap);
            const cy = drawY;
            const btnW = cardW * 0.8;
            const btnH = h * 0.06;
            const bX = cx + (cardW - btnW)/2;
            const bYPos = cy + cardH * 0.78;

            if (vx >= bX && vx <= bX + btnW && vy >= bYPos && vy <= bYPos + btnH) {
                this.shopSelectedIndex = i;
                this.handleShopAction();
                return;
            }
        }
        
        drawY += cardH + 30;
        drawY += secSize + 16;
        
        for (let i = 0; i < 3; i++) {
            const ix = contentX + cardGap + i * (cardW + cardGap);
            const iy = drawY;
            const btnW = cardW * 0.8;
            const btnH = h * 0.06;
            const bX = ix + (cardW - btnW)/2;
            const bYPos = iy + cardH * 0.78;
            
            if (vx >= bX && vx <= bX + btnW && vy >= bYPos && vy <= bYPos + btnH) {
                if (i === 0) { // Revive
                    if ((this.extraLives || 0) >= 2) {
                        this.audio.init(); this.audio.playHitWallSound();
                    } else if (this.coins >= 25) {
                        this.shopConfirmType = 'item';
                        this.shopConfirmIndex = 0;
                        this.audio.init(); this.audio.playBrickSound(0.9);
                    } else {
                        this.audio.init(); this.audio.playLifeLost();
                    }
                } else if (i === 1) { // Speedster
                    if (this.speedsterActive) {
                        this.audio.init(); this.audio.playHitWallSound();
                    } else if (this.coins >= 50) {
                        this.shopConfirmType = 'item';
                        this.shopConfirmIndex = 1;
                        this.audio.init(); this.audio.playBrickSound(0.9);
                    } else {
                        this.audio.init(); this.audio.playLifeLost();
                    }
                }
                return;
            }
        }
    }

    handleShopAction() {
        const comp = this.companions[this.shopSelectedIndex];
        if (!comp) return;

        if (!comp.owned) {
            if (this.coins >= comp.price) {
                this.shopConfirmType = 'companion';
                this.shopConfirmIndex = this.shopSelectedIndex;
                this.audio.init(); this.audio.playBrickSound(0.9);
            } else {
                this.audio.init(); this.audio.playLifeLost();
            }
        } else {
            if (!comp.equipped) {
                this.companions.forEach(c => c.equipped = false);
                comp.equipped = true;
                this.audio.init(); this.audio.playBrickSound(1.3);
                this.saveProgress();
            }
        }
    }

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
            
            // Inner OS Window for Card
            this.drawOSRect(ctx, cx, cy, cardW, cardH, false, '#c0c0c0');
            
            // Inner Window Title
            const cTitleH = h * 0.04;
            ctx.fillStyle = '#000080';
            ctx.fillRect(cx + 4, cy + 4, cardW - 8, cTitleH);
            const nSize = h * 0.024;
            const nW = textWidth(ctx, comp.name, nSize);
            drawText(ctx, comp.name, cx + (cardW - nW)/2, cy + 8, nSize, '#ffffff');
            
            // Content bg
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx + 4, cy + 4 + cTitleH, cardW - 8, cardH - 8 - cTitleH);
            this.drawOSRect(ctx, cx + 4, cy + 4 + cTitleH, cardW - 8, cardH - 8 - cTitleH, true, 'transparent');
            
            // Diamond Icon
            const iSz = cardH * 0.15;
            ctx.save();
            ctx.translate(cx + cardW/2, cy + cTitleH + cardH * 0.25);
            ctx.beginPath();
            ctx.moveTo(0, -iSz); ctx.lineTo(iSz*0.7, 0); ctx.lineTo(0, iSz); ctx.lineTo(-iSz*0.7, 0);
            ctx.fillStyle = `rgb(${comp.color[0]}, ${comp.color[1]}, ${comp.color[2]})`;
            ctx.fill();
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
            ctx.restore();
            
            // Desc
            const dSize = h * 0.022;
            const dW = textWidth(ctx, comp.desc, dSize);
            drawText(ctx, comp.desc, cx + (cardW - dW)/2, cy + cTitleH + cardH * 0.45, dSize, '#404040');
            
            // Buy/Equip Button
            const btnW = cardW * 0.8;
            const btnH = h * 0.06;
            const btnX = cx + (cardW - btnW)/2;
            const btnY = cy + cardH * 0.78;
            
            this.drawOSRect(ctx, btnX, btnY, btnW, btnH, false, '#c0c0c0');
            
            let btnText = '';
            if (comp.owned) {
                btnText = comp.equipped ? 'EQUIPPED' : 'EQUIP';
            } else {
                btnText = `$${comp.price} BUY`;
            }
            const bTW = textWidth(ctx, btnText, dSize);
            drawText(ctx, btnText, btnX + (btnW - bTW)/2, btnY + (btnH - dSize)/2, dSize, '#000000');
        }
        
        drawY += cardH + 30;
        
        drawText(ctx, 'ITEMS:', contentX + 16, drawY, secSize, '#000000');
        drawY += secSize + 16;
        
        const shopItems = [
            { id: 'revive', name: 'REVIVE', desc: '+1 Life', price: 25, icon: '\u2665', color: [255, 80, 120], available: true },
            { id: 'speedster', name: 'SPEEDSTER', desc: '+Speed', price: 50, icon: '\u00BB', color: [0, 255, 255], available: true },
            { id: 'soon1', name: 'COMING', desc: 'SOON', price: null, icon: '?', color: [100, 100, 130], available: false },
        ];
        
        for (let i = 0; i < shopItems.length; i++) {
            const item = shopItems[i];
            const ix = contentX + cardGap + i * (cardW + cardGap);
            const iy = drawY;
            
            // Inner OS Window for Card
            this.drawOSRect(ctx, ix, iy, cardW, cardH, false, '#c0c0c0');
            
            // Inner Window Title
            const cTitleH = h * 0.04;
            ctx.fillStyle = '#000080';
            ctx.fillRect(ix + 4, iy + 4, cardW - 8, cTitleH);
            const nSize = h * 0.024;
            const nW = textWidth(ctx, item.name, nSize);
            drawText(ctx, item.name, ix + (cardW - nW)/2, iy + 8, nSize, '#ffffff');
            
            // Content bg
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ix + 4, iy + 4 + cTitleH, cardW - 8, cardH - 8 - cTitleH);
            this.drawOSRect(ctx, ix + 4, iy + 4 + cTitleH, cardW - 8, cardH - 8 - cTitleH, true, 'transparent');
            
            // Icon
            const iSize = h * 0.07;
            const iW = textWidth(ctx, item.icon, iSize);
            drawText(ctx, item.icon, ix + (cardW - iW)/2, iy + cTitleH + cardH * 0.15, iSize, `rgb(${item.color.join(',')})`);
            
            // Desc
            const dSize = h * 0.022;
            const dW = textWidth(ctx, item.desc, dSize);
            drawText(ctx, item.desc, ix + (cardW - dW)/2, iy + cTitleH + cardH * 0.45, dSize, '#404040');
            
            // Button
            const btnW = cardW * 0.8;
            const btnH = h * 0.06;
            const btnX = ix + (cardW - btnW)/2;
            const btnY = iy + cardH * 0.78;
            
            this.drawOSRect(ctx, btnX, btnY, btnW, btnH, false, '#c0c0c0');
            
            let btnText = '';
            if (item.available) {
                let isBoughtOut = false;
                if (item.id === 'speedster' && this.speedsterActive) isBoughtOut = true;
                if (item.id === 'revive' && (this.extraLives || 0) >= 2) isBoughtOut = true;
                
                if (isBoughtOut) {
                    btnText = 'MAX';
                } else {
                    btnText = `$${item.price} BUY`;
                }
            } else {
                btnText = 'N/A';
            }
            
            const bTW = textWidth(ctx, btnText, dSize);
            drawText(ctx, btnText, btnX + (btnW - bTW)/2, btnY + (btnH - dSize)/2, dSize, '#000000');
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
        
        // Cello Helper (Popup)
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
        const dialogs = [
            'Hi! Welcome to the shop!',
            'Buy Companions to help\ndestroy blocks!',
            'Collect coins to buy them.\nLet us go shopping!',
            'Any help?'
        ];
        const step = Math.min(this.shopAssistantStep, dialogs.length - 1);
        const msg = dialogs[step];

        // Make it a compact popup in bottom right corner
        const cw = w * 0.30;
        const ch = h * 0.20;
        const cx = w * 0.65;
        const cy = h * 0.75;
        
        this.drawOSRect(ctx, cx, cy, cw, ch, false, '#c0c0c0');
        const titleH = h * 0.05;
        ctx.fillStyle = '#000080';
        ctx.fillRect(cx + 4, cy + 4, cw - 8, titleH);
        drawText(ctx, 'CELLO.exe', cx + 10, cy + 8, h * 0.03, '#ffffff');
        
        ctx.fillStyle = '#ffffff';
        const textH = ch - titleH - 8;
        ctx.fillRect(cx + 4, cy + titleH + 4, cw - 8, textH);
        this.drawOSRect(ctx, cx + 4, cy + titleH + 4, cw - 8, textH, true, 'transparent');
        
        // Simple ASCII face
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${h * 0.025}px monospace`;
        ctx.fillText('(o.o)', cx + 12, cy + titleH + 30);
        
        ctx.font = `${h * 0.02}px sans-serif`;
        // Draw dialog
        const lines = msg.split('\n');
        let ty = cy + titleH + 25;
        for(let li = 0; li < lines.length; li++) {
            ctx.fillText(lines[li], cx + 70, ty);
            ty += h * 0.03;
        }
    }
"""

with open('js/game.js', 'w', encoding='utf-8') as f:
    f.write(content[:start_idx] + new_code + "\n" + content[end_idx:])

print("Successfully replaced shop logic and UI!")
