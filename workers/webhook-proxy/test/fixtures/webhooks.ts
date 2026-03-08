import type { DiscordWebhookPayload } from '../../src/parsers/types';

export const CYBERSOLE_SUCCESS: DiscordWebhookPayload = {
  username: 'Cybersole',
  avatar_url: 'https://cybersole.io/logo.png',
  embeds: [
    {
      title: 'Successful Checkout',
      color: 65280,
      thumbnail: { url: 'https://static.nike.com/dunk-low.png' },
      fields: [
        { name: 'Product', value: 'Nike Dunk Low Retro White Black', inline: true },
        { name: 'Size', value: '10', inline: true },
        { name: 'Price', value: '$110.00', inline: true },
        { name: 'Store', value: 'Nike US', inline: true },
        { name: 'SKU', value: 'DD1391-100', inline: true },
        { name: 'Profile', value: 'Profile #3', inline: true },
        { name: 'Proxy', value: 'ISP DC 1', inline: true },
        { name: 'Mode', value: 'Safe', inline: true },
        { name: 'Order #', value: 'C10298374651', inline: false },
        { name: 'Checkout Time', value: '2.3s', inline: true },
      ],
      footer: { text: 'Cybersole | 2026-03-07 10:15:32' },
      timestamp: '2026-03-07T10:15:32.000Z',
    },
  ],
};

export const VALOR_SUCCESS: DiscordWebhookPayload = {
  username: 'Valor',
  avatar_url: 'https://valoraio.com/logo.png',
  embeds: [
    {
      title: 'Checkout Success',
      color: 3066993,
      thumbnail: { url: 'https://images.stockx.com/yeezy-onyx.jpg' },
      fields: [
        { name: 'Item', value: 'adidas Yeezy Boost 350 V2 Onyx', inline: true },
        { name: 'Size', value: '11', inline: true },
        { name: 'Price', value: '$230.00', inline: true },
        { name: 'Site', value: 'Adidas US', inline: true },
        { name: 'Style', value: 'HQ4540', inline: true },
        { name: 'Billing Profile', value: 'Main Card', inline: true },
        { name: 'Proxy Group', value: 'Residential US', inline: true },
        { name: 'Task Mode', value: 'Fast', inline: true },
        { name: 'Speed', value: '1.8s', inline: true },
      ],
      footer: { text: 'ValorAIO v4.2' },
      timestamp: '2026-03-07T11:30:45.000Z',
    },
  ],
};

export const NSB_SUCCESS: DiscordWebhookPayload = {
  username: 'NSB - Nike Shoe Bot',
  avatar_url: 'https://nikeshoebot.com/logo.png',
  embeds: [
    {
      title: 'Successfully Checked Out!',
      color: 65280,
      thumbnail: { url: 'https://static.nike.com/air-jordan-1.png' },
      fields: [
        { name: 'Product Name', value: 'Air Jordan 1 Retro High OG Chicago', inline: true },
        { name: 'Shoe Size', value: '9.5', inline: true },
        { name: 'Price', value: '$180.00', inline: true },
        { name: 'Retailer', value: 'Footlocker US', inline: true },
        { name: 'Style Code', value: 'DZ5485-612', inline: true },
        { name: 'Profile', value: 'Amex 1', inline: true },
        { name: 'Proxy', value: 'DC East', inline: true },
        { name: 'Order Number', value: 'FL-7829104', inline: false },
        { name: 'Account', value: 'john***@gmail.com', inline: true },
      ],
      footer: { text: 'NSB v4.0.1' },
      timestamp: '2026-03-07T09:00:12.000Z',
    },
  ],
};

export const GENERIC_SUCCESS: DiscordWebhookPayload = {
  username: 'MyCustomBot',
  avatar_url: 'https://example.com/bot.png',
  embeds: [
    {
      title: 'Copped!',
      color: 3394611,
      thumbnail: { url: 'https://example.com/product.jpg' },
      fields: [
        { name: 'Name', value: 'New Balance 550 White Green', inline: true },
        { name: 'Sz', value: '10.5', inline: true },
        { name: 'Cost', value: '$109.99', inline: true },
        { name: 'Website', value: 'New Balance US', inline: true },
        { name: 'PID', value: 'BB550WT1', inline: true },
        { name: 'Payment', value: 'Profile A', inline: true },
        { name: 'Proxies', value: 'ISP Group 2', inline: true },
        { name: 'Conf #', value: 'NB-998877', inline: false },
      ],
      footer: { text: 'MyCustomBot v1.0' },
      timestamp: '2026-03-07T14:22:08.000Z',
    },
  ],
};

export const CYBERSOLE_DECLINE: DiscordWebhookPayload = {
  username: 'Cybersole',
  avatar_url: 'https://cybersole.io/logo.png',
  embeds: [
    {
      title: 'Card Declined',
      color: 16711680,
      fields: [
        { name: 'Product', value: 'Nike Air Max 90', inline: true },
        { name: 'Size', value: '12', inline: true },
        { name: 'Price', value: '$130.00', inline: true },
        { name: 'Store', value: 'Nike US', inline: true },
        { name: 'Profile', value: 'Profile #1', inline: true },
        { name: 'Proxy', value: 'ISP DC 2', inline: true },
      ],
      footer: { text: 'Cybersole | 2026-03-07 10:20:00' },
      timestamp: '2026-03-07T10:20:00.000Z',
    },
  ],
};

export const MINIMAL_PAYLOAD: DiscordWebhookPayload = {
  username: 'UnknownBot',
  embeds: [
    {
      title: 'Checkout',
      color: 65280,
      fields: [
        { name: 'Product', value: 'Mystery Item', inline: true },
        { name: 'Store', value: 'Unknown Store', inline: true },
      ],
      footer: { text: 'UnknownBot' },
    },
  ],
};
