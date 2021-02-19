module Main exposing (main)

import Browser
import Browser.Navigation as Nav
import Html exposing (..)
import Html.Events exposing (onClick)
import Html.Keyed
import Html.Lazy
import Markdown
import Url



-- Add some interactivity and test re-renders!
-- Then add JS additions to body!
-- Note: Text nodes. Google translate can wrap them.
-- Idea: Have a MutationObserver that notices changes and marks areas as changed.


main : Program () Model Msg
main =
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        , onUrlRequest = UrlRequested
        , onUrlChange = UrlChanged
        }


type alias Model =
    { key : Nav.Key
    , url : Url.Url
    , state : Int
    }


init : () -> Url.Url -> Nav.Key -> ( Model, Cmd Msg )
init () url key =
    ( { key = key
      , url = url
      , state = 0
      }
    , Cmd.none
    )


type Msg
    = NextState
    | UrlRequested Browser.UrlRequest
    | UrlChanged Url.Url


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NextState ->
            ( { model | state = model.state + 1 }, Cmd.none )

        UrlRequested urlRequest ->
            case urlRequest of
                Browser.Internal url ->
                    ( model, Nav.pushUrl model.key (Url.toString url) )

                Browser.External href ->
                    ( model, Nav.load href )

        UrlChanged url ->
            ( { model | url = url }
            , Cmd.none
            )


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.none


view : Model -> Browser.Document Msg
view model =
    { title = "Application Title"
    , body =
        [ text ("text " ++ String.fromInt model.state)
        , div [] [ text ("diverse: " ++ String.fromInt model.state) ]
        , Html.Keyed.node "sektion" [] [ ( "1", text ("Nyckel: " ++ String.fromInt model.state) ) ]
        , Html.Lazy.lazy viewNum model.state
        , map identity (text ("karta: " ++ String.fromInt model.state))
        , Markdown.toHtml [] ("nedåt: " ++ String.fromInt model.state)
        , Html.button [ onClick NextState ] [ text "Nästa" ]
        ]
            |> (\list ->
                    case model.state of
                        0 ->
                            list

                        1 ->
                            list

                        2 ->
                            List.reverse list

                        3 ->
                            List.drop 2 list

                        _ ->
                            list
               )
    }


viewNum : Int -> Html msg
viewNum n =
    Html.text ("Lat: " ++ String.fromInt n)
