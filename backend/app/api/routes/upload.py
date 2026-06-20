from fastapi import APIRouter, UploadFile, File, HTTPException
from app.core.config import get_settings
import shutil
import os

settings = get_settings()

router = APIRouter()


@router.post("/")
async def upload(file: UploadFile = File(...)) -> dict:
    """Upload a CSV or Excel file and save it to the uploads directory."""
    upload_dir = settings.UPLOAD_DIR

    content = await file.read()
    file.file.seek(0)

    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the maximum allowed size")

    # reject anything that isn't csv or excel before touching the filesystem
    if not file.filename.endswith((".csv", ".xlsx")):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files allowed")

    # create uploads directory if it doesn't exist
    os.makedirs(upload_dir, exist_ok=True)

    # build full path using os.path.join to handle separators correctly
    destination = os.path.join(upload_dir, file.filename)

    # stream file contents to disk
    with open(destination, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"file_path": destination}