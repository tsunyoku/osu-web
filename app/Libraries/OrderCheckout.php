<?php

/**
 *    Copyright 2015-2017 ppy Pty. Ltd.
 *
 *    This file is part of osu!web. osu!web is distributed with the hope of
 *    attracting more community contributions to the core ecosystem of osu!.
 *
 *    osu!web is free software: you can redistribute it and/or modify
 *    it under the terms of the Affero GNU General Public License version 3
 *    as published by the Free Software Foundation.
 *
 *    osu!web is distributed WITHOUT ANY WARRANTY; without even the implied
 *    warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *    See the GNU Affero General Public License for more details.
 *
 *    You should have received a copy of the GNU Affero General Public License
 *    along with osu!web.  If not, see <http://www.gnu.org/licenses/>.
 */

namespace App\Libraries;

use App\Libraries\Payments\InvalidOrderStateException;
use App\Models\Store\Order;
use App\Models\SupporterTag;
use DB;
use Request;

class OrderCheckout
{
    private $order;

    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    public function getOrder()
    {
        return $this->order;
    }

    public function allowXsollaPayment()
    {
        return !$this->order->requiresShipping();
    }

    public function allowCentiliPayment()
    {
        # Geolocation header from Cloudflare
        $isJapan = strcasecmp(Request::header('Cf-Ipcountry'), 'JP') === 0;

        return $isJapan && Request::input('intl') !== '1';
    }

    public function getXsollaCheckoutCode()
    {
        $extraDatas = $this->supporterTagItems()->pluck('extra_data');
        $mapped = [];
        foreach ($extraDatas as $data) {
            $mapped[] = $data['target_id'] . "-" . $data['duration'];
        }

        return $this->order->user_id . ':' . implode($mapped, ',');
    }

    public function getXsollaCheckoutDescription()
    {
        $extraDatas = $this->supporterTagItems()->pluck('extra_data');
        $mapped = [];
        foreach ($extraDatas as $data) {
            $mapped[] = $data['target_id'];
        }

        return "osu! supporter tags for " . implode(array_unique($mapped), ', ');
    }

    public function getCentiliPaymentLink()
    {
        $params = [
            'api=' . config('payments.centili.api_key'),
            'country=jp',
            'countrylock=true',
            'clientid=' . $this->order->getOrderNumber(),
            'amount=' . $this->order->getTotal() * config('payments.centili.conversion_rate'),
        ];

        $queryString = implode('&', $params);

        return config('payments.centili.widget_url') . '?' . $queryString;
    }

    public function isShippingDelayed()
    {
        return Order::where('orders.status', 'paid')->count() > config('osu.store.delayed_shipping_order_threshold');
    }

    public function completeCheckout()
    {
        DB::connection('mysql-store')->transaction(function () {
            $order = $this->order->lockSelf();

            // cart should only be in:
            // incart -> if user hits the callback first.
            // paid -> if payment provider hits the callback first.
            // any other state should be considered invalid.
            if ($order->status === 'incart') {
                $order->status = 'checkout';
                $order->saveorExplode();
            } elseif ($order->status !== 'paid') {
                // TODO: use validation errors instead?
                throw new InvalidOrderStateException(
                    "`Order {$order->order_id}` in wrong state: `{$order->status}`"
                );
            }
        });
    }

    /**
     * Helper method for completing checkout with just the order id
     *
     * @param string|int $orderId
     * @return Order
     */
    public static function complete($orderId)
    {
        // select for update will lock the table if the row doesn't exist,
        // so do a double select.
        $order = Order::findOrFail($orderId);
        $checkout = new static($order);
        $checkout->completeCheckout();

        return $order;
    }

    private function supporterTagItems()
    {
        return $this->order->items()
            ->join('products', 'order_items.product_id', 'products.product_id')
            ->where('products.custom_class', SupporterTag::PRODUCT_CUSTOM_CLASS);
    }
}
