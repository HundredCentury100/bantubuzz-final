def get_bank_transfer_details(reference=None):
    """Return BantuBuzz bank-transfer instructions shown across payment flows."""
    details = {
        "accounts": [
            {
                "bank_name": "ZB Bank",
                "account_name": "Bakoena Technologies",
                "account_number": "412700940820405",
                "currency": "USD",
                "branch": "Longcheng Plaza",
                "branch_code": "4127",
                "swift_code": "ZBCOZWHXXXX",
            },
            {
                "bank_name": "Innbucks Microbank",
                "account_name": "Bakoena Technologies",
                "account_number": "019942086890001",
                "account_type": "FCADUS",
            },
        ],
    }
    if reference:
        details["reference"] = reference
    return details
