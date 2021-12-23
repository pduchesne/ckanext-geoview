# -*- coding: utf-8 -*-

import logging

import ckan.lib.base as base

import ckanext.geoview.utils as utils


log = logging.getLogger(__name__)


class ServiceProxyController(base.BaseController):
    def proxy_service(self, resource_id):
        data_dict = {"resource_id": resource_id}
        context = {
            "model": base.model,
            "session": base.model.Session,
            "user": base.c.user or base.c.author,
        }
        return utils.proxy_service_resource(
            self._py_object.request, context, data_dict
        )

    def proxy_service_url(self, map_id = None):
        req = self._py_object.request
        if ('ckanext.spatial.common_map.'+map_id+'.url') in base.config:
            # backward compatible with old geoview config
            url = base.config.get('ckanext.spatial.common_map.'+map_id+'.url')
        elif ('ckanext.geoview.basemaps_map') in base.config:
            # check if exists in basemaps config
            url = base.config['ckanext.geoview.basemaps_map'].get(map_id)['url']

        return utils.proxy_service_url(self, url)