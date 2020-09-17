# -*- coding: utf-8 -*-

from ckan import plugins as p


class GeoViewMixin(p.SingletonPlugin):
    p.implements(p.IRoutes, inherit=True)

    # IRoutes

    def before_map(self, m):
        controller = (
            "ckanext.geoview.controllers.service_proxy:ServiceProxyController"
        )
        m.connect(
            'service_proxy.proxy_service',
            "/dataset/{id}/resource/{resource_id}/service_proxy",
            controller=controller,
            action="proxy_service",
        )

        m.connect(
            'service_proxy.proxy_service_url',
            "/basemap_service/{map_id}",
            controller=controller,
            action="proxy_service_url",
        )
        return m
