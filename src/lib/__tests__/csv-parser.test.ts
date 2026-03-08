import { describe, it, expect } from 'vitest';
import { parseCSV, detectFormat, parseTransactions } from '@/lib/csv-parser';

describe('parseCSV', () => {
  it('parses simple CSV', () => {
    const csv = 'Name,Age,City\nAlice,30,NYC\nBob,25,LA';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['Name', 'Age', 'City']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ Name: 'Alice', Age: '30', City: 'NYC' });
    expect(result.rows[1]).toEqual({ Name: 'Bob', Age: '25', City: 'LA' });
  });

  it('handles quoted fields with commas', () => {
    const csv = 'Name,Description\nShoe,"Nike Dunk Low, Panda"';
    const result = parseCSV(csv);
    expect(result.rows[0].Description).toBe('Nike Dunk Low, Panda');
  });

  it('handles escaped double quotes', () => {
    const csv = 'Name,Notes\nItem,"He said ""hello"""';
    const result = parseCSV(csv);
    expect(result.rows[0].Notes).toBe('He said "hello"');
  });

  it('handles empty CSV', () => {
    const result = parseCSV('');
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('handles headers only', () => {
    const result = parseCSV('A,B,C');
    expect(result.headers).toEqual(['A', 'B', 'C']);
    expect(result.rows).toEqual([]);
  });

  it('handles missing trailing fields', () => {
    const csv = 'A,B,C\n1,2';
    const result = parseCSV(csv);
    expect(result.rows[0]).toEqual({ A: '1', B: '2', C: '' });
  });

  it('preserves unicode characters', () => {
    const csv = 'Name,Value\nTest,\u00e9\u00e8\u00ea';
    const result = parseCSV(csv);
    expect(result.rows[0].Value).toBe('\u00e9\u00e8\u00ea');
  });

  it('preserves special characters', () => {
    const csv = 'Name,Value\nTest,"P@$$w0rd!#%^&*()"';
    const result = parseCSV(csv);
    expect(result.rows[0].Value).toBe('P@$$w0rd!#%^&*()');
  });
});

describe('detectFormat', () => {
  it('detects Chase format', () => {
    expect(detectFormat(['Transaction Date', 'Type', 'Amount', 'Memo'])).toBe('chase');
  });

  it('detects Capital One format', () => {
    expect(detectFormat(['Transaction Date', 'Card No.', 'Description', 'Debit', 'Credit'])).toBe('capital_one');
  });

  it('detects Citi format', () => {
    expect(detectFormat(['Date', 'Description', 'Status', 'Debit', 'Credit'])).toBe('citi');
  });

  it('detects Amex format', () => {
    expect(detectFormat(['Date', 'Description', 'Amount'])).toBe('amex');
  });

  it('returns unknown for unrecognized headers', () => {
    expect(detectFormat(['Col1', 'Col2', 'Col3'])).toBe('unknown');
  });
});

describe('parseTransactions', () => {
  it('parses Chase CSV correctly', () => {
    const csv = 'Transaction Date,Description,Amount,Category,Type,Memo\n01/15/2025,Nike Store,-150.00,Shopping,Sale,';
    const result = parseTransactions(csv);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Nike Store');
    expect(result[0].amount).toBe(150); // Chase negates
  });

  it('parses Amex CSV correctly', () => {
    const csv = 'Date,Description,Amount\n01/15/2025,Footlocker,89.99';
    const result = parseTransactions(csv, 'amex');
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(89.99);
  });

  it('returns empty for unknown format without mapping', () => {
    const csv = 'X,Y,Z\n1,2,3';
    const result = parseTransactions(csv);
    expect(result).toEqual([]);
  });

  it('uses column mapping for unknown format', () => {
    const csv = 'MyDate,MyDesc,MyAmount\n01/15/2025,Test,42.50';
    const result = parseTransactions(csv, 'unknown', {
      date: 'MyDate',
      description: 'MyDesc',
      amount: 'MyAmount',
    });
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Test');
    expect(result[0].amount).toBe(42.50);
  });

  it('handles empty rows', () => {
    const csv = 'Date,Description,Amount';
    const result = parseTransactions(csv, 'amex');
    expect(result).toEqual([]);
  });

  it('preserves raw row data', () => {
    const csv = 'Date,Description,Amount\n01/15/2025,Test,10';
    const result = parseTransactions(csv, 'amex');
    expect(result[0].raw).toBeDefined();
    expect(result[0].raw.Description).toBe('Test');
  });
});
