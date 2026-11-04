"""Restart-safe minute poller. DB transaction locks prevent duplicate restocking."""
import logging
import time
from .order_atm import expiry_pass

logging.basicConfig(level=logging.INFO)
if __name__=="__main__":
    while True:
        try:
            expiry_pass()
        except Exception:
            logging.exception("payment worker pass failed")
        time.sleep(60)
