import qrcode
from PIL import Image, ImageDraw

def generate_whatsapp_qr():
    # 1. Generate the base QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # High error correction to allow center logo
        box_size=10,
        border=0,  # We will add custom border/background later for better styling
    )
    qr.add_data("https://wa.me/919360756749")
    qr.make(fit=True)

    # 2. Create the QR image (black modules on a white background)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_width, qr_height = qr_img.size

    # 3. Load and prepare the WhatsApp logo
    # Wikimedia logo was downloaded to test_wa.png
    logo = Image.open("test_wa.png")
    
    # 4. Calculate sizes
    # Center logo should be roughly 22% of the QR code width for optimal readability and scannability
    logo_size = int(qr_width * 0.22)
    logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

    # 5. Create a white circular background for the logo so it stands out cleanly from the QR modules
    # Adding a white circular mask with border
    border_width = 4
    mask_size = logo_size + border_width * 2
    mask_img = Image.new("RGBA", (mask_size, mask_size), (0, 0, 0, 0))
    
    # Draw a solid white circle on the mask image
    draw = ImageDraw.Draw(mask_img)
    draw.ellipse([0, 0, mask_size - 1, mask_size - 1], fill=(255, 255, 255, 255))
    
    # Paste the WhatsApp logo into the center of the white circular background
    logo_rgba = logo.convert("RGBA")
    logo_pos_x = border_width
    logo_pos_y = border_width
    mask_img.alpha_composite(logo_rgba, (logo_pos_x, logo_pos_y))

    # 6. Paste the combined circular logo (with its white border) onto the center of the QR code
    pos_x = (qr_width - mask_size) // 2
    pos_y = (qr_height - mask_size) // 2
    qr_img.paste(mask_img, (pos_x, pos_y), mask_img)

    # 7. Add a nice white padding/border around the whole QR code
    padding = 20
    final_size = qr_width + padding * 2
    final_img = Image.new("RGB", (final_size, final_size), (255, 255, 255))
    final_img.paste(qr_img, (padding, padding))

    # 8. Save the final image
    final_img.save("whatsapp_qr.png", "PNG")
    print("WhatsApp QR code generated successfully at whatsapp_qr.png")

if __name__ == "__main__":
    generate_whatsapp_qr()
