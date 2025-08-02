import os
import uuid
import logging
from flask import Flask, request, send_file, render_template, after_this_request
from werkzeug.utils import secure_filename
import fitz  # PyMuPDF
from docx import Document
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from textwrap import wrap
import pypandoc

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
CONVERTED_FOLDER = 'converted'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CONVERTED_FOLDER, exist_ok=True)

logging.basicConfig(level=logging.INFO)

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt', 'odt', 'rtf', 'md', 'html', 'htm', 'epub'}
OUTPUT_FORMATS = {'txt', 'pdf', 'docx', 'odt', 'rtf', 'md', 'html', 'epub'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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
            return pypandoc.convert_file(path, 'plain')
        except OSError:
            raise RuntimeError("Pandoc is not installed. Install from https://pandoc.org/installing.html")
    else:
        raise ValueError("Unsupported input format")

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
        pypandoc.convert_text(text, fmt, format='plain', outputfile=out_path)
    else:
        raise ValueError("Unsupported output format")

@app.route("/", methods=["GET", "POST"])
def index():
    error = None
    if request.method == "POST":
        uploaded_file = request.files.get('file')
        output_format = request.form.get('format', '').lower()

        if not uploaded_file or not allowed_file(uploaded_file.filename):
            error = "Invalid or missing input file."
        elif output_format not in OUTPUT_FORMATS:
            error = "Invalid or unsupported output format."
        else:
            try:
                file_id = str(uuid.uuid4())
                ext = uploaded_file.filename.rsplit('.', 1)[1].lower()
                input_path = os.path.join(UPLOAD_FOLDER, f"{file_id}.{ext}")
                output_path = os.path.join(CONVERTED_FOLDER, f"{file_id}.{output_format}")

                uploaded_file.save(input_path)
                logging.info(f"Uploaded: {input_path}")

                text = extract_text(input_path, ext)
                save_as_format(text, output_path, output_format)

                @after_this_request
                def cleanup(response):
                    try:
                        os.remove(input_path)
                        os.remove(output_path)
                        logging.info("Cleaned temporary files.")
                    except Exception as cleanup_error:
                        logging.error(f"Cleanup error: {cleanup_error}")
                    return response

                return send_file(output_path, as_attachment=True)

            except Exception as e:
                logging.error(f"Conversion error: {e}")
                error = f"Error during conversion: {e}"

    return render_template("index.html", formats=sorted(OUTPUT_FORMATS), error=error)

if __name__ == "__main__":
    app.run(debug=True)
