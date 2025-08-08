import os
import uuid
import logging
from flask import Flask, request, send_file, render_template, after_this_request, send_from_directory, jsonify
from werkzeug.utils import secure_filename
import fitz  # PyMuPDF
from docx import Document
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from textwrap import wrap
import pypandoc
from PIL import Image
import io

# Flask setup
app = Flask(__name__)

# Folders
UPLOAD_FOLDER = 'uploads'
CONVERTED_FOLDER = 'converted'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CONVERTED_FOLDER, exist_ok=True)

# Logging
logging.basicConfig(level=logging.INFO)

# Supported formats
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt', 'odt', 'rtf', 'md', 'html', 'htm', 'epub'}
OUTPUT_FORMATS = {'txt', 'pdf', 'docx', 'odt', 'rtf', 'md', 'html', 'epub'}
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# Utility: Check if file is allowed
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def allowed_image(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

# Extract text from input file
def extract_text(path, ext):
    ext = ext.lower()
    if ext == 'pdf':
        doc = fitz.open(path)
        return "\n".join(page.get_text() for page in doc)
    elif ext == 'docx':
        doc = Document(path)
        return '\n'.join(p.text for p in doc.paragraphs)
    elif ext in ALLOWED_EXTENSIONS:
        try:
            pypandoc.get_pandoc_path()
        except OSError:
            logging.warning("Pandoc not found. Downloading...")
            pypandoc.download_pandoc()
        try:
            return pypandoc.convert_file(path, 'markdown')
        except Exception as e:
            raise RuntimeError(f"Failed to extract using pypandoc: {e}")
    else:
        raise ValueError(f"Unsupported input format: {ext}")

# Save text to output file format
def save_as_format(text, out_path, fmt):
    fmt = fmt.lower()
    if fmt == 'txt':
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(text)
    elif fmt == 'pdf':
        c = canvas.Canvas(out_path, pagesize=A4)
        width, height = A4
        y = height - inch
        for line in text.splitlines():
            for wrapped_line in wrap(line, 100):
                c.drawString(1 * inch, y, wrapped_line)
                y -= 15
                if y < inch:
                    c.showPage()
                    y = height - inch
        c.save()
    elif fmt in OUTPUT_FORMATS:
        try:
            pypandoc.get_pandoc_path()
        except OSError:
            logging.warning("Pandoc not found. Downloading...")
            pypandoc.download_pandoc()
        try:
            pypandoc.convert_text(text, to=fmt, format='markdown', outputfile=out_path)
        except Exception as e:
            raise RuntimeError(f"Error converting to {fmt}: {e}")
    else:
        raise ValueError(f"Unsupported output format: {fmt}")

# =======================
# Main Route (Doc Convert)
# =======================
@app.route("/", methods=["GET", "POST"])
def index():
    error = None
    if request.method == "POST":
        uploaded_file = request.files.get('file')
        output_format = request.form.get('output_format', '').lower()

        if not uploaded_file or not allowed_file(uploaded_file.filename):
            error = "Invalid or missing input file."
        elif output_format not in OUTPUT_FORMATS:
            error = "Invalid or unsupported output format."
        else:
            try:
                original_name = secure_filename(uploaded_file.filename.rsplit('.', 1)[0])
                ext = uploaded_file.filename.rsplit('.', 1)[1].lower()
                input_filename = f"{original_name}.{ext}"
                output_filename = f"{original_name}.{output_format}"
                input_path = os.path.join(UPLOAD_FOLDER, input_filename)
                output_path = os.path.join(CONVERTED_FOLDER, output_filename)

                uploaded_file.save(input_path)
                logging.info(f"Uploaded: {input_path}")

                text = extract_text(input_path, ext)
                save_as_format(text, output_path, output_format)

                @after_this_request
                def cleanup(response):
                    try:
                        os.remove(input_path)
                        logging.info(f"Deleted input file: {input_path}")
                    except Exception as cleanup_error:
                        logging.error(f"Cleanup error (input): {cleanup_error}")
                    return response

                download_url = f"/download/{output_filename}"
                return render_template("index.html", formats=sorted(OUTPUT_FORMATS), success="Conversion successful!", download_link=download_url)

            except Exception as e:
                logging.exception("Conversion error:")
                error = f"Error during conversion: {e}"

    return render_template("index.html", formats=sorted(OUTPUT_FORMATS), error=error)

# =======================
# Download Route
# =======================
@app.route("/download/<filename>")
def download_file(filename):
    path = os.path.join(CONVERTED_FOLDER, filename)
    return send_file(path, as_attachment=True, download_name=filename)

# =======================
# Image to PDF Route
# =======================
@app.route("/image-to-pdf")
def image_to_pdf():
    return render_template("image-to-pdf.html")

@app.route('/convert-images', methods=['POST'])
def convert_images():
    images = request.files.getlist('images')
    pil_images = []
    for img in images:
        pil_img = Image.open(img).convert('RGB')
        pil_images.append(pil_img)
    if not pil_images:
        return "No images uploaded", 400
    pdf_bytes = io.BytesIO()
    pil_images[0].save(
        pdf_bytes,
        format='PDF',
        save_all=True,
        append_images=pil_images[1:]
    )
    pdf_bytes.seek(0)
    return send_file(
        pdf_bytes,
        mimetype='application/pdf',
        as_attachment=True,
        download_name='converted.pdf'
    )
# =======================
# Run app
# =======================
if __name__ == "__main__":
    app.run(debug=True)