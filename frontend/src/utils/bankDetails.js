export const bankTransferAccounts = [
  {
    bank_name: 'ZB Bank',
    account_name: 'Bakoena Technologies',
    account_number: '412700940820405',
    currency: 'USD',
    branch: 'Longcheng Plaza',
    branch_code: '4127',
    swift_code: 'ZBCOZWHXXXX',
  },
  {
    bank_name: 'Innbucks Microbank',
    account_name: 'Bakoena Technologies',
    account_number: '019942086890001',
    account_type: 'FCADUS',
  },
];

export const normalizeBankDetails = (bankDetails = null, reference = null) => {
  const accounts = Array.isArray(bankDetails?.accounts) && bankDetails.accounts.length > 0
    ? bankDetails.accounts
    : bankTransferAccounts;

  return {
    accounts,
    reference: bankDetails?.reference || reference || bankDetails?.payment_reference || null,
  };
};
